import Link from "next/link";
import type { ToolDef } from "@/lib/tools";
import { discoveryFor } from "@/lib/discovery";
import { assetUrl } from "@/lib/site";
const inputs = {
  pdf: "PDF (.pdf)",
  image: "JPG, PNG or WebP",
  document: "Word OOXML (.docx)",
  spreadsheet: "Excel OOXML (.xlsx)",
  text: "UTF-8 text or typed text",
  "pdf-image": "PDF, JPG, PNG or WebP",
};
export default function ToolDiscovery({ tool }: { tool: ToolDef }) {
  const detail = discoveryFor(tool);
  if (!detail) return null;
  return (
    <section className="tool-discovery" aria-labelledby={`details-${tool.slug}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">WHAT TO EXPECT</span>
          <h2 id={`details-${tool.slug}`}>{tool.name}: input, output and practical limits</h2>
        </div>
      </div>
      <dl className="tool-specs">
        <div>
          <dt>Accepted input</dt>
          <dd>{inputs[tool.accept]}</dd>
        </div>
        <div>
          <dt>Where it runs</dt>
          <dd>Locally in your browser; no document-processing upload</dd>
        </div>
        <div>
          <dt>Price / account</dt>
          <dd>Free to use; no account required</dd>
        </div>
        <div>
          <dt>Input safety caps</dt>
          <dd>100 MB per file; 300 MB per workspace; device/pixel/page budgets also apply</dd>
        </div>
      </dl>
      <div className="discovery-columns">
        <div>
          <h3>When this is useful</h3>
          <p>{detail.usefulFor}</p>
        </div>
        <div>
          <h3>What you download</h3>
          <p>{detail.produces}</p>
        </div>
      </div>
      <h3>Check these details before sharing</h3>
      <p>{detail.watchFor}</p>
      {tool.slug === "pdf-to-word" && (
        <div className="sample-panel">
          <h3>Try a public synthetic before/after sample</h3>
          <p>
            This small text-based PDF was generated for testing, not taken from a customer. Its DOCX
            was produced by this converter. Use it to inspect editable text—not to infer exact
            formatting for tables, photos or complex PDFs.
          </p>
          <div className="sample-links">
            <a href={assetUrl("/examples/pdf-to-word/sample-input.pdf")} download>
              Download sample PDF
            </a>
            <a href={assetUrl("/examples/pdf-to-word/sample-output.docx")} download>
              Download actual DOCX output
            </a>
          </div>
          <p className="settings-note">
            Sample document data is CC0; that does not change the application’s restricted-use
            license or upstream licenses.
          </p>
        </div>
      )}
      {detail.guide && (
        <p>
          <Link href={`/guides/${detail.guide.slug}/`} prefetch={false}>
            {detail.guide.label} →
          </Link>
        </p>
      )}
      {detail.next?.length && (
        <div className="workflow-links">
          <h3>Related workflows</h3>
          <ul>
            {detail.next.map((item) => (
              <li key={item.slug}>
                <Link href={`/tools/${item.slug}/`} prefetch={false}>
                  {item.label}
                </Link>
                <span> — {item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="settings-note">
        <Link href="/testing/" prefetch={false}>
          Read the testing method and limitations
        </Link>
        . Passing fixtures do not establish perfect security, full compatibility or legal
        certification.
      </p>
    </section>
  );
}
