import type { Metadata } from "next";
import { absolute } from "@/lib/site";
import CallbackFinisher from "./finisher";

export const metadata: Metadata = {
  title: "Completing Cloud Sign-In | PDFORGE",
  description:
    "This page completes a Google Drive, Dropbox or OneDrive sign-in started in PDFORGE and closes itself. Nothing to do here by hand.",
  alternates: { canonical: absolute("oauth/callback/") },
};

export default function OAuthCallback() {
  return (
    <main className="page oauth-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CLOUD SIGN-IN</span>
          <h1>Completing sign-in…</h1>
          <p className="lede">This window closes itself once the provider answers.</p>
        </div>
      </div>
      <CallbackFinisher />
    </main>
  );
}
