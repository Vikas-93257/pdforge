import { PdfError } from "./engine";
/** Read dimensions before the browser decodes a potentially enormous image. */
export function imageDimensions(bytes: Uint8Array): { width: number; height: number } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    width = v.getUint32(16);
    height = v.getUint32(20);
  } else if (bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let p = 2;
    while (p + 4 <= bytes.length) {
      if (bytes[p] !== 0xff) {
        p++;
        continue;
      }
      while (bytes[p] === 0xff) p++;
      const marker = bytes[p++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (p + 2 > bytes.length) break;
      const size = v.getUint16(p);
      if (size < 2 || p + size > bytes.length) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        size >= 7
      ) {
        height = v.getUint16(p + 3);
        width = v.getUint16(p + 5);
        break;
      }
      p += size;
    }
  } else if (
    bytes.length >= 30 &&
    new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
  ) {
    const kind = new TextDecoder().decode(bytes.subarray(12, 16));
    if (kind === "VP8X") {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (kind === "VP8L" && bytes[20] === 0x2f) {
      width = 1 + ((bytes[21] | (bytes[22] << 8)) & 0x3fff);
      height = 1 + (((bytes[22] >> 6) | (bytes[23] << 2) | (bytes[24] << 10)) & 0x3fff);
    } else if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = v.getUint16(26, true) & 0x3fff;
      height = v.getUint16(28, true) & 0x3fff;
    }
  }
  if (!width || !height)
    throw new PdfError(
      "The image header is invalid or unsupported. Choose a standard JPG, PNG or WebP.",
      "INVALID",
    );
  if (width * height > 24000000 || width > 16384 || height > 16384)
    throw new PdfError(
      "This image exceeds 24 megapixels or 16,384 pixels on one side. Resize it before processing.",
      "LIMIT",
    );
  return { width, height };
}
