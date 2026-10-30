"use client";
import { useCallback, useState } from "react";
import {
  buildAuthUrl,
  exchangeCode,
  isConfigured,
  pkcePair,
  tokenStore,
  type DriveProviderId,
  type DriveTokens,
} from "./oauth";
import { DriveClient } from "./client";

const pendingKey = (state: string) => `pdforge-drive-pending-${state}`;

export function useDriveAuth(id: DriveProviderId) {
  const [tokens, setTokens] = useState<DriveTokens | null>(() =>
    typeof window === "undefined" ? null : tokenStore.load(id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = useCallback(async (): Promise<DriveTokens | null> => {
    if (!isConfigured(id) || busy) return tokens;
    setError("");
    setBusy(true);
    try {
      const { verifier, challenge } = await pkcePair();
      const state = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
      sessionStorage.setItem(pendingKey(state), verifier);
      const popup = window.open(
        buildAuthUrl(id, challenge, state),
        "pdforge-drive-auth",
        "width=520,height=640",
      );
      if (!popup) throw new Error("The sign-in popup was blocked. Allow popups and try again.");
      const code = await new Promise<string>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          window.removeEventListener("message", onMessage);
          reject(new Error("Sign-in timed out. Try again."));
        }, 300000);
        const onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          const data = event.data as {
            type?: string;
            state?: string;
            code?: string;
            error?: string;
          };
          if (data?.type !== "pdforge-drive-auth" || data.state !== state) return;
          window.clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          if (data.error || !data.code) reject(new Error("Sign-in was cancelled or failed."));
          else resolve(data.code);
        };
        window.addEventListener("message", onMessage);
      });
      const saved = sessionStorage.getItem(pendingKey(state)) ?? "";
      sessionStorage.removeItem(pendingKey(state));
      const fresh = await exchangeCode(id, code, saved);
      tokenStore.save(id, fresh);
      setTokens(fresh);
      return fresh;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [id, busy, tokens]);

  const disconnect = useCallback(() => {
    tokenStore.clear(id);
    setTokens(null);
    setError("");
  }, [id]);

  const client = tokens ? new DriveClient(id, tokens) : null;
  return {
    configured: isConfigured(id),
    tokens,
    client,
    busy,
    error,
    connect,
    disconnect,
    setError,
  };
}
