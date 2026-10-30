import { absolute } from "../site";

export type DriveProviderId = "google" | "dropbox" | "onedrive";

export type DriveTokens = { access: string; refresh: string; expiresAt: number };

export const PROVIDERS: Record<
  DriveProviderId,
  { name: string; auth: string; token: string; scope: string; envVar: string }
> = {
  google: {
    name: "Google Drive",
    auth: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/drive.file",
    envVar: "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  },
  dropbox: {
    name: "Dropbox",
    auth: "https://www.dropbox.com/oauth2/authorize",
    token: "https://api.dropboxapi.com/oauth2/token",
    scope: "",
    envVar: "NEXT_PUBLIC_DROPBOX_CLIENT_ID",
  },
  onedrive: {
    name: "OneDrive",
    auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "Files.ReadWrite.AppFolder offline_access",
    envVar: "NEXT_PUBLIC_ONEDRIVE_CLIENT_ID",
  },
};

export const clientId = (id: DriveProviderId) => process.env[PROVIDERS[id].envVar] ?? "";

export const redirectUri = () => absolute("/oauth/callback/");

export const isConfigured = (id: DriveProviderId) => clientId(id).length > 0;

export function configuredProviders(): DriveProviderId[] {
  return (Object.keys(PROVIDERS) as DriveProviderId[]).filter(isConfigured);
}

function bytesToUrlSafe(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function pkcePair() {
  const verifier = bytesToUrlSafe(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return { verifier, challenge: bytesToUrlSafe(new Uint8Array(digest)) };
}

export function buildAuthUrl(id: DriveProviderId, challenge: string, state: string) {
  const provider = PROVIDERS[id];
  const params = new URLSearchParams({
    client_id: clientId(id),
    redirect_uri: redirectUri(),
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  if (provider.scope) params.set("scope", provider.scope);
  if (id === "dropbox") params.set("token_access_type", "offline");
  return `${provider.auth}?${params.toString()}`;
}

export async function exchangeCode(
  id: DriveProviderId,
  code: string,
  verifier: string,
  fetchImpl: typeof fetch = fetch,
) {
  const provider = PROVIDERS[id];
  const body = new URLSearchParams({
    client_id: clientId(id),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const response = await fetchImpl(provider.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok)
    throw new Error(`${provider.name} refused the sign-in code. Try connecting again.`);
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error(`${provider.name} returned no access token.`);
  return {
    access: data.access_token,
    refresh: data.refresh_token ?? "",
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  } satisfies DriveTokens;
}

export async function refreshAccess(
  id: DriveProviderId,
  refresh: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DriveTokens> {
  const provider = PROVIDERS[id];
  if (!refresh) throw new Error(`${provider.name} needs a fresh sign-in. Reconnect to continue.`);
  const body = new URLSearchParams({
    client_id: clientId(id),
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  const response = await fetchImpl(provider.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok)
    throw new Error(`${provider.name} refused the saved session. Reconnect to continue.`);
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error(`${provider.name} returned no access token.`);
  return {
    access: data.access_token,
    refresh: data.refresh_token ?? refresh,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
}

const storeKey = (id: DriveProviderId) => `pdforge-drive-${id}`;

export const tokenStore = {
  load(id: DriveProviderId): DriveTokens | null {
    try {
      const raw = sessionStorage.getItem(storeKey(id));
      if (!raw) return null;
      const tokens = JSON.parse(raw) as DriveTokens;
      return tokens.access ? tokens : null;
    } catch {
      return null;
    }
  },
  save(id: DriveProviderId, tokens: DriveTokens) {
    try {
      sessionStorage.setItem(storeKey(id), JSON.stringify(tokens));
    } catch {
      // Private-mode storage can throw; the session simply won't persist.
    }
  },
  clear(id: DriveProviderId) {
    try {
      sessionStorage.removeItem(storeKey(id));
    } catch {
      // Nothing persisted to clear.
    }
  },
};

export const needsRefresh = (tokens: DriveTokens) => tokens.expiresAt - Date.now() < 60000;
