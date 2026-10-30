import type { Metadata } from "next";
import Link from "next/link";
import { absolute } from "@/lib/site";
import { PIPELINES } from "@/lib/pipelines";
import PipelineRunner from "@/components/PipelineRunner";

export const metadata: Metadata = {
  title: "Document Pipelines — Chain PDF Tools Locally | PDFORGE",
  description:
    "Run multi-step document workflows entirely in your browser: ready-made pipelines or your own chain of compatible tools. Files never leave your device.",
  alternates: { canonical: absolute("pipelines/") },
  openGraph: {
    title: "Document Pipelines — Chain PDF Tools Locally | PDFORGE",
    description:
      "Run multi-step document workflows entirely in your browser: ready-made pipelines or your own chain of compatible tools.",
    url: absolute("pipelines/"),
  },
};

export default function Pipelines() {
  return (
    <main className="page pipelines-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MULTI-STEP WORKFLOWS</span>
          <h1>Document pipelines, still 100% local</h1>
          <p className="lede">
            Chain compatible tools so the output of one step feeds the next — for example, recognize
            a scan and then shrink it. {PIPELINES.length} ready-made pipelines ship with the app, or
            build your own from tools that need no hands-on input.
          </p>
        </div>
      </div>
      <PipelineRunner />
      <section className="article-content" aria-label="Pipeline limits">
        <h2>Honest limits</h2>
        <ul>
          <li>Every step runs with default settings; per-step options are not yet adjustable.</li>
          <li>
            Tools that need drawn signatures, redaction boxes, typed text or field values stay
            single-run only.
          </li>
          <li>At most 8 steps and 50 files per run, within the usual 100/300 MB caps.</li>
          <li>
            Prefer the terminal?{" "}
            <Link href="/guides/command-line-pipelines/">Script the same pipelines</Link> with the
            local CLI.
          </li>
        </ul>
      </section>
    </main>
  );
}
