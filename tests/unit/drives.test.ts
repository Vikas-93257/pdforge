import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

type Captured = { url: string; init: RequestInit };
const mockFetch = (
  handler: (url: string, init: RequestInit) => { ok: boolean; status: number; body: unknown },
  seen: Captured[] = [],
) => {
  const fn = (async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    const r = handler(url, init);
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
      arrayBuffer: async () =>
        r.body instanceof Uint8Array
          ? r.body.slice().buffer
          : new TextEncoder().encode(String(r.body)).buffer,
    };
  }) as unknown as typeof fetch;
  return { fn, seen };
};

test("PKCE challenge is the base64url SHA-256 of the verifier", async () => {
  const { pkcePair } = await import("../../src/lib/drives/oauth");
  const { verifier, challenge } = await pkcePair();
  assert.ok(verifier.length >= 43 && !/[+/=]/.test(verifier));
  const expected = createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  assert.equal(challenge, expected);
});

test("auth URLs carry PKCE, state and least-privilege scopes", async () => {
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "google-test-id";
  process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID = "dropbox-test-id";
  process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID = "onedrive-test-id";
  const oauth = await import("../../src/lib/drives/oauth");
  assert.deepEqual(oauth.configuredProviders(), ["google", "dropbox", "onedrive"]);
  const google = new URL(oauth.buildAuthUrl("google", "challenge-1", "state-1"));
  assert.equal(google.searchParams.get("client_id"), "google-test-id");
  assert.equal(google.searchParams.get("code_challenge_method"), "S256");
  assert.equal(google.searchParams.get("scope"), "https://www.googleapis.com/auth/drive.file");
  assert.ok(google.searchParams.get("redirect_uri")!.endsWith("/oauth/callback/"));
  const dropbox = new URL(oauth.buildAuthUrl("dropbox", "challenge-2", "state-2"));
  assert.equal(dropbox.searchParams.get("token_access_type"), "offline");
  const one = new URL(oauth.buildAuthUrl("onedrive", "challenge-3", "state-3"));
  assert.match(one.searchParams.get("scope")!, /Files\.ReadWrite\.AppFolder/);
});

test("code exchange posts the PKCE verifier and parses tokens", async () => {
  const oauth = await import("../../src/lib/drives/oauth");
  const { fn, seen } = mockFetch(() => ({
    ok: true,
    status: 200,
    body: { access_token: "a", refresh_token: "r", expires_in: 100 },
  }));
  const tokens = await oauth.exchangeCode("google", "code-1", "verifier-1", fn);
  assert.equal(tokens.access, "a");
  assert.equal(tokens.refresh, "r");
  assert.ok(tokens.expiresAt > Date.now());
  assert.equal(seen.length, 1);
  assert.match(seen[0].url, /oauth2\.googleapis\.com\/token/);
  const body = new URLSearchParams(seen[0].init.body as string);
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code_verifier"), "verifier-1");
});

test("token failures ask for a reconnect instead of crashing", async () => {
  const oauth = await import("../../src/lib/drives/oauth");
  const bad = mockFetch(() => ({ ok: false, status: 400, body: {} }));
  await assert.rejects(
    oauth.exchangeCode("google", "bad", "v", bad.fn),
    /refused the sign-in code/,
  );
  await assert.rejects(oauth.refreshAccess("dropbox", "", bad.fn), /fresh sign-in/);
  const { fn } = mockFetch(() => ({
    ok: true,
    status: 200,
    body: { access_token: "a2", expires_in: 100 },
  }));
  const kept = await oauth.refreshAccess("onedrive", "old-refresh", fn);
  assert.equal(kept.refresh, "old-refresh");
});

test("file listing parses all three provider shapes", async () => {
  const { DriveClient } = await import("../../src/lib/drives/client");
  const tokens = { access: "a", refresh: "r", expiresAt: Date.now() + 3600000 };
  const google = mockFetch(() => ({
    ok: true,
    status: 200,
    body: {
      files: [
        { id: "g1", name: "a.pdf", mimeType: "application/pdf", size: "42", modifiedTime: "2026" },
      ],
    },
  }));
  const g = new DriveClient("google", tokens, google.fn);
  assert.deepEqual(await g.list("a"), [
    { id: "g1", name: "a.pdf", mime: "application/pdf", size: 42, modified: "2026" },
  ]);
  assert.match(google.seen[0].url, /drive\/v3\/files/);
  const dropbox = mockFetch((url) => ({
    ok: true,
    status: 200,
    body: url.includes("search_v2")
      ? { matches: [{ metadata: { metadata: { id: "d1", name: "b.pdf", size: 7 } } }] }
      : { entries: [{ ".tag": "file", id: "d2", name: "c.pdf", size: 8 }] },
  }));
  const d = new DriveClient("dropbox", tokens, dropbox.fn);
  assert.equal((await d.list("b"))[0].id, "d1");
  assert.equal((await d.list(""))[0].id, "d2");
  const one = mockFetch(() => ({
    ok: true,
    status: 200,
    body: { value: [{ id: "o1", name: "d.pdf", size: 9, file: { mimeType: "application/pdf" } }] },
  }));
  const o = new DriveClient("onedrive", tokens, one.fn);
  const listed = await o.list("");
  assert.equal(listed[0].mime, "application/pdf");
});

test("downloads enforce the size cap and uploads hit the right endpoints", async () => {
  const { DriveClient } = await import("../../src/lib/drives/client");
  const tokens = { access: "a", refresh: "r", expiresAt: Date.now() + 3600000 };
  const d = new DriveClient(
    "dropbox",
    tokens,
    mockFetch(() => ({ ok: true, status: 200, body: new Uint8Array([1]) })).fn,
  );
  await assert.rejects(
    d.download({ id: "x", name: "big.pdf", mime: "", size: 101 * 1024 * 1024, modified: "" }),
    /100 MB/,
  );
  const seen: Captured[] = [];
  const g = new DriveClient(
    "google",
    tokens,
    mockFetch(() => ({ ok: true, status: 200, body: {} }), seen).fn,
  );
  await g.upload("out.pdf", new Uint8Array([1, 2]), "application/pdf");
  assert.match(seen[0].url, /upload\/drive\/v3\/files\?uploadType=multipart/);
  const o = new DriveClient(
    "onedrive",
    tokens,
    mockFetch(() => ({ ok: true, status: 200, body: {} }), seen).fn,
  );
  await o.upload("out.pdf", new Uint8Array([1, 2]), "application/pdf");
  assert.equal(seen[1].init.method, "PUT");
  await assert.rejects(g.upload("empty.pdf", new Uint8Array(), "application/pdf"), /empty/);
});

test("expired sessions refresh once, then ask for a reconnect", async () => {
  const { DriveClient } = await import("../../src/lib/drives/client");
  const calls: string[] = [];
  const fn = mockFetch((url) => {
    calls.push(url);
    if (url.includes("token"))
      return { ok: true, status: 200, body: { access_token: "fresh", expires_in: 3600 } };
    return { ok: true, status: 200, body: { files: [] } };
  }).fn;
  const client = new DriveClient(
    "google",
    { access: "old", refresh: "r", expiresAt: Date.now() - 1 },
    fn,
  );
  assert.deepEqual(await client.list(""), []);
  assert.ok(
    calls.some((u) => u.includes("token")),
    "expected a refresh call",
  );
  const dead = new DriveClient(
    "google",
    { access: "old", refresh: "r", expiresAt: Date.now() + 3600000 },
    mockFetch(() => ({ ok: false, status: 401, body: {} })).fn,
  );
  await assert.rejects(dead.list(""), /Reconnect/);
});
