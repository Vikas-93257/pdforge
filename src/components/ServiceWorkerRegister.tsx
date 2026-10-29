"use client";
import { useEffect } from "react";
const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")
    )
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
  }, []);
  return null;
}
