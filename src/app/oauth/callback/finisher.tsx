"use client";
import { useEffect, useState } from "react";

function statusFor(search: string, hasOpener: boolean) {
  const params = new URLSearchParams(search);
  const error = params.get("error") ?? "";
  if (!hasOpener)
    return error
      ? "Sign-in was cancelled at the provider. Close this window and try again."
      : "This page only finishes a sign-in started in PDFORGE. Close it and start from the app.";
  return "Sign-in received. This window can be closed.";
}

export default function CallbackFinisher() {
  const [message] = useState(() =>
    typeof window === "undefined"
      ? "Waiting for the provider…"
      : statusFor(window.location.search, !!window.opener),
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!window.opener) return;
    window.opener.postMessage(
      {
        type: "pdforge-drive-auth",
        code: params.get("code") ?? "",
        state: params.get("state") ?? "",
        error: params.get("error") ?? "",
      },
      window.location.origin,
    );
    const timer = window.setTimeout(() => window.close(), 600);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <p className="settings-note" role="status">
      {message}
    </p>
  );
}
