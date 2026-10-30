import {
  PROVIDERS,
  refreshAccess,
  needsRefresh,
  tokenStore,
  type DriveProviderId,
  type DriveTokens,
} from "./oauth";

export type DriveFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  modified: string;
};

type Fetch = typeof fetch;

const MAX_LIST = 100;

export class DriveClient {
  private tokens: DriveTokens;
  constructor(
    readonly provider: DriveProviderId,
    tokens: DriveTokens,
    private fetchImpl: Fetch = fetch,
  ) {
    this.tokens = tokens;
  }

  get name() {
    return PROVIDERS[this.provider].name;
  }

  private async authorized(): Promise<string> {
    if (needsRefresh(this.tokens)) {
      this.tokens = await refreshAccess(this.provider, this.tokens.refresh, this.fetchImpl);
      tokenStore.save(this.provider, this.tokens);
    }
    return this.tokens.access;
  }

  private async call(input: string, init: RequestInit, what: string) {
    const response = await this.fetchImpl(input, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${await this.authorized()}` },
    });
    if (response.status === 401) {
      tokenStore.clear(this.provider);
      throw new Error(`${this.name} rejected this session. Reconnect to continue.`);
    }
    if (!response.ok) throw new Error(`${this.name} could not ${what}. Try again.`);
    return response;
  }

  async list(query: string): Promise<DriveFile[]> {
    const q = query.trim();
    if (this.provider === "google") {
      const terms = ["trashed = false"];
      if (q) terms.push(`name contains '${q.replace(/'/g, "\\'")}'`);
      const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
        q: terms.join(" and "),
        orderBy: "modifiedTime desc",
        pageSize: String(MAX_LIST),
        fields: "files(id,name,mimeType,size,modifiedTime)",
      })}`;
      const data = (await (await this.call(url, {}, "list files")).json()) as {
        files?: {
          id: string;
          name: string;
          mimeType: string;
          size?: string;
          modifiedTime?: string;
        }[];
      };
      return (data.files ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        mime: f.mimeType,
        size: Number(f.size ?? 0),
        modified: f.modifiedTime ?? "",
      }));
    }
    if (this.provider === "dropbox") {
      if (!q) {
        const data = (await (
          await this.call(
            "https://api.dropboxapi.com/2/files/list_folder",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: "", limit: MAX_LIST }),
            },
            "list files",
          )
        ).json()) as {
          entries?: {
            id: string;
            name: string;
            size?: number;
            client_modified?: string;
            ".tag"?: string;
          }[];
        };
        return (data.entries ?? [])
          .filter((e) => e[".tag"] === "file")
          .map((e) => ({
            id: e.id,
            name: e.name,
            mime: "",
            size: e.size ?? 0,
            modified: e.client_modified ?? "",
          }));
      }
      const data = (await (
        await this.call(
          "https://api.dropboxapi.com/2/files/search_v2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q, options: { max_results: MAX_LIST } }),
          },
          "search files",
        )
      ).json()) as {
        matches?: {
          metadata?: {
            metadata?: { id: string; name: string; size?: number; client_modified?: string };
          };
        }[];
      };
      return (data.matches ?? [])
        .map((m) => m.metadata?.metadata)
        .filter(
          (m): m is { id: string; name: string; size?: number; client_modified?: string } =>
            !!m?.id,
        )
        .map((m) => ({
          id: m.id,
          name: m.name,
          mime: "",
          size: m.size ?? 0,
          modified: m.client_modified ?? "",
        }));
    }
    const base = "https://graph.microsoft.com/v1.0/me/drive";
    const url = q
      ? `${base}/root/search(q='${encodeURIComponent(q)}')?$top=${MAX_LIST}&$select=id,name,size,lastModifiedDateTime`
      : `${base}/root/children?$top=${MAX_LIST}&$orderby=lastModifiedDateTime desc&$select=id,name,size,lastModifiedDateTime,file`;
    const data = (await (await this.call(url, {}, "list files")).json()) as {
      value?: {
        id: string;
        name: string;
        size?: number;
        lastModifiedDateTime?: string;
        file?: { mimeType?: string };
      }[];
    };
    return (data.value ?? [])
      .filter((e) => (q ? true : !!e.file))
      .map((e) => ({
        id: e.id,
        name: e.name,
        mime: e.file?.mimeType ?? "",
        size: e.size ?? 0,
        modified: e.lastModifiedDateTime ?? "",
      }));
  }

  async download(file: DriveFile): Promise<Uint8Array> {
    if (file.size > 100 * 1024 * 1024)
      throw new Error(`"${file.name}" exceeds the 100 MB per-file safety limit.`);
    const url =
      this.provider === "google"
        ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`
        : this.provider === "dropbox"
          ? "https://content.dropboxapi.com/2/files/download"
          : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.id)}/content`;
    const headers: Record<string, string> =
      this.provider === "dropbox" ? { "Dropbox-API-Arg": JSON.stringify({ path: file.id }) } : {};
    const bytes = new Uint8Array(
      await (await this.call(url, { headers }, `download "${file.name}"`)).arrayBuffer(),
    );
    if (!bytes.length) throw new Error(`"${file.name}" downloaded empty. Try again.`);
    return bytes;
  }

  async upload(name: string, bytes: Uint8Array, mime: string): Promise<void> {
    if (!bytes.length) throw new Error(`"${name}" is empty; nothing was uploaded.`);
    if (this.provider === "google") {
      const metadata = JSON.stringify({ name, mimeType: mime });
      const body = new Blob(
        [
          `--pdforge\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--pdforge\r\nContent-Type: ${mime}\r\n\r\n`,
          bytes.slice().buffer as ArrayBuffer,
          `\r\n--pdforge--`,
        ],
        { type: "multipart/related; boundary=pdforge" },
      );
      await this.call(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        { method: "POST", body },
        `upload "${name}"`,
      );
      return;
    }
    if (this.provider === "dropbox") {
      await this.call(
        "https://content.dropboxapi.com/2/files/upload",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({ path: `/${name}`, mode: "overwrite" }),
          },
          body: bytes.slice().buffer as ArrayBuffer,
        },
        `upload "${name}"`,
      );
      return;
    }
    await this.call(
      `https://graph.microsoft.com/v1.0/me/drive/items/root:/${encodeURIComponent(name)}:/content`,
      {
        method: "PUT",
        headers: { "Content-Type": mime },
        body: bytes.slice().buffer as ArrayBuffer,
      },
      `upload "${name}"`,
    );
  }
}
