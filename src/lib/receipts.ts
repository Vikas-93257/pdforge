import { version as APP_VERSION } from "../../package.json";
import { safeFilename } from "./site";
import type { ToolOptions } from "./operations";
export type ReceiptJob =
  | { kind: "tool"; slug: string; name: string }
  | { kind: "pipeline"; id: string; steps: string[] };
export type ReceiptFile = { name: string; size: number; sha256: string };
export type Receipt = {
  app: "pdforge";
  version: string;
  at: string;
  job: ReceiptJob;
  settings: Record<string, unknown>;
  inputs: ReceiptFile[];
  outputs: ReceiptFile[];
  note: string;
};
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("SHA-256 hashing is not available in this context.");
  const digest = await subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Settings are recorded so a run can be reproduced; binary secrets never are.
export function sanitizeSettings(o: ToolOptions): Record<string, unknown> {
  const { signature, password, passwordConfirm, ...rest } = o;
  void password;
  void passwordConfirm;
  return JSON.parse(
    JSON.stringify({
      ...rest,
      password: o.password ? "[withheld]" : "",
      signature: signature ? `[${signature.length} bytes withheld]` : null,
    }),
  ) as Record<string, unknown>;
}
export function receiptName(inputName: string, job: string): string {
  const stem = safeFilename(inputName.replace(/\.[^.]+$/, "") || "document");
  return `${stem}-${job}-receipt.json`;
}
export async function buildReceipt(args: {
  job: ReceiptJob;
  settings: ToolOptions;
  inputs: { name: string; bytes: Uint8Array }[];
  outputs: { name: string; bytes: Uint8Array }[];
}): Promise<{ name: string; bytes: Uint8Array; receipt: Receipt }> {
  const hash = async (f: { name: string; bytes: Uint8Array }): Promise<ReceiptFile> => ({
    name: f.name,
    size: f.bytes.length,
    sha256: await sha256Hex(f.bytes),
  });
  const receipt: Receipt = {
    app: "pdforge",
    version: APP_VERSION,
    at: new Date().toISOString(),
    job: args.job,
    settings: sanitizeSettings(args.settings),
    inputs: await Promise.all(args.inputs.map(hash)),
    outputs: await Promise.all(args.outputs.map(hash)),
    note: "Generated locally by PDFORGE. It attests that these outputs were produced from these inputs with these settings; it does not certify document contents.",
  };
  const jobTag = args.job.kind === "tool" ? args.job.slug : `pipe-${args.job.id}`;
  return {
    name: receiptName(args.inputs[0]?.name ?? "document", jobTag),
    bytes: new TextEncoder().encode(JSON.stringify(receipt, null, 2)),
    receipt,
  };
}
