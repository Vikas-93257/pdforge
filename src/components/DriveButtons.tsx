"use client";
import Link from "next/link";
import { useState } from "react";
import { Cloud, CloudDownload, CloudUpload, LoaderCircle, X } from "lucide-react";
import type { ToolDef } from "@/lib/tools";
import type { OutputFile } from "@/lib/operations";
import { PROVIDERS, configuredProviders, type DriveProviderId } from "@/lib/drives/oauth";
import { DriveClient, type DriveFile } from "@/lib/drives/client";
import { useDriveAuth } from "@/lib/drives/useDriveAuth";
import { fmtBytes } from "@/lib/site";

export function DriveOpenButton({
  accept,
  disabled,
  onPick,
}: {
  accept: ToolDef["accept"];
  disabled: boolean;
  onPick: (file: { name: string; mime: string; bytes: Uint8Array }) => void;
}) {
  const [open, setOpen] = useState<DriveProviderId | null>(null);
  const providers = configuredProviders();
  void accept;
  return (
    <div className="drive-open">
      {providers.length === 0 ? (
        <p className="settings-note">
          Cloud import is not configured on this site.{" "}
          <Link href="/guides/cloud-storage-setup/">How site owners enable it</Link>
        </p>
      ) : (
        <div className="drive-provider-row">
          <Cloud size={15} aria-hidden="true" />
          <span>Open from</span>
          {providers.map((id) => (
            <button
              key={id}
              type="button"
              className="button button-outline button-small"
              disabled={disabled}
              onClick={() => setOpen(id)}
            >
              <CloudDownload size={14} aria-hidden="true" /> {PROVIDERS[id].name}
            </button>
          ))}
        </div>
      )}
      {open && <DrivePicker provider={open} onClose={() => setOpen(null)} onPick={onPick} />}
    </div>
  );
}

function DrivePicker({
  provider,
  onClose,
  onPick,
}: {
  provider: DriveProviderId;
  onClose: () => void;
  onPick: (file: { name: string; mime: string; bytes: Uint8Array }) => void;
}) {
  const auth = useDriveAuth(provider);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [listing, setListing] = useState(false);
  const [fetching, setFetching] = useState<string | null>(null);
  const [error, setError] = useState("");

  const search = async () => {
    if (!auth.client || listing) return;
    setError("");
    setListing(true);
    try {
      setFiles(await auth.client.list(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Listing failed. Try again.");
    } finally {
      setListing(false);
    }
  };

  const pick = async (file: DriveFile) => {
    if (!auth.client || fetching) return;
    setError("");
    setFetching(file.id);
    try {
      const bytes = await auth.client.download(file);
      onPick({ name: file.name, mime: file.mime || "application/octet-stream", bytes });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed. Try again.");
    } finally {
      setFetching(null);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${PROVIDERS[provider].name} file picker`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2>Open from {PROVIDERS[provider].name}</h2>
          <button type="button" className="text-button" onClick={onClose} aria-label="Close picker">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {!auth.tokens ? (
          <>
            <p>
              Connect {PROVIDERS[provider].name} to browse files. Sign-in happens directly with the
              provider; PDFORGE has no server and never sees your password.
            </p>
            <button
              type="button"
              className="button button-green"
              disabled={auth.busy}
              onClick={() => void auth.connect()}
            >
              {auth.busy ? (
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
              ) : (
                <Cloud size={16} aria-hidden="true" />
              )}
              {auth.busy ? "Waiting for sign-in…" : `Connect ${PROVIDERS[provider].name}`}
            </button>
            {auth.error && (
              <p className="form-error" role="alert">
                {auth.error}
              </p>
            )}
          </>
        ) : (
          <>
            <form
              className="drive-search"
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <input
                type="search"
                aria-label="Search cloud files"
                placeholder="Search, or list recent files"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="button button-outline" disabled={listing}>
                {listing ? (
                  <LoaderCircle size={15} className="spin" aria-hidden="true" />
                ) : (
                  "List files"
                )}
              </button>
            </form>
            {files && (
              <ul className="drive-list">
                {files.length === 0 && <li className="muted">No files found.</li>}
                {files.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      disabled={fetching !== null}
                      onClick={() => void pick(file)}
                    >
                      <span>{file.name}</span>
                      <small>
                        {file.size ? fmtBytes(file.size) : "unknown size"}
                        {file.modified ? ` · ${file.modified.slice(0, 10)}` : ""}
                      </small>
                      {fetching === file.id && (
                        <LoaderCircle size={14} className="spin" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="text-button" onClick={auth.disconnect}>
              Disconnect {PROVIDERS[provider].name}
            </button>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function DriveSaveButtons({ files }: { files: OutputFile[] }) {
  const providers = configuredProviders();
  if (!providers.length) return null;
  return (
    <div className="drive-save">
      <span className="muted">Save a copy to cloud</span>
      {providers.map((id) => (
        <DriveSaveButton key={id} provider={id} files={files} />
      ))}
    </div>
  );
}

function DriveSaveButton({ provider, files }: { provider: DriveProviderId; files: OutputFile[] }) {
  const auth = useDriveAuth(provider);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = async () => {
    if (busy || auth.busy) return;
    setBusy(true);
    setMessage("");
    try {
      let active = auth.client;
      if (!active) {
        const fresh = await auth.connect();
        if (fresh) active = new DriveClient(provider, fresh);
      }
      if (!active) throw new Error(auth.error || "Sign-in did not complete.");
      for (const file of files) {
        setMessage(`Uploading ${file.name}…`);
        await active.upload(file.name, file.bytes, file.mime);
      }
      setMessage(
        `Saved ${files.length} file${files.length === 1 ? "" : "s"} to ${PROVIDERS[provider].name}.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="drive-save-one">
      <button
        type="button"
        className="button button-outline button-small"
        disabled={busy || auth.busy}
        onClick={() => void save()}
      >
        {busy || auth.busy ? (
          <LoaderCircle size={14} className="spin" aria-hidden="true" />
        ) : (
          <CloudUpload size={14} aria-hidden="true" />
        )}
        {PROVIDERS[provider].name}
      </button>
      {message && <span className="settings-note">{message}</span>}
    </span>
  );
}
