import { StandardFonts, type PDFDocument, type PDFFont } from "pdf-lib";
import { assetUrl } from "../site";
const fontCache = new Map<string, Promise<Uint8Array>>();
async function fontBytes(name: string) {
  if (!fontCache.has(name))
    fontCache.set(
      name,
      (async () => {
        if (typeof window === "undefined") {
          const fs = await import(
            /* webpackIgnore: true */ /* turbopackIgnore: true */ "node:fs/promises"
          );
          return new Uint8Array(await fs.readFile(`${process.cwd()}/public/fonts/${name}.ttf`));
        }
        const response = await fetch(assetUrl(`/fonts/${name}.ttf`));
        if (!response.ok)
          throw new Error("The local font could not be loaded. Please reload the page.");
        return new Uint8Array(await response.arrayBuffer());
      })(),
    );
  return fontCache.get(name)!;
}
export async function embedTextFont(
  doc: PDFDocument,
  text: string,
  bold = false,
): Promise<PDFFont> {
  if (/^[\x20-\x7e\n\r\t]*$/.test(text))
    return doc.embedFont(bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  await import("regenerator-runtime/runtime");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  doc.registerFontkit(fontkit);
  const name = /[\u0900-\u097f]/.test(text) ? "NotoSansDevanagari" : "NotoSans";
  const font = await doc.embedFont(await fontBytes(name), { subset: true });
  const supported = new Set(font.getCharacterSet());
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp > 32 && !supported.has(cp) && cp !== 0x200d && cp !== 0x200c) {
      throw new Error(
        `The bundled font cannot represent “${char}”. Use Latin or Devanagari text without unsupported emoji or scripts.`,
      );
    }
  }
  return font;
}
