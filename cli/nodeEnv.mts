import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import type { CanvasEnv } from "../src/lib/pdf/render";
import { PdfError } from "../src/lib/pdf/engine";

export const nodeEnv: CanvasEnv = {
  createCanvas(w, h) {
    const canvas = createCanvas(w, h);
    return { canvas, ctx: canvas.getContext("2d") };
  },
  async toBytes(canvas, format, quality) {
    return new Uint8Array(
      format === "png"
        ? (canvas as Canvas).toBuffer("image/png")
        : (canvas as Canvas).toBuffer("image/jpeg", Math.round(quality * 100)),
    );
  },
};

export async function nodeNormalize(bytes: Uint8Array, type: string) {
  const image = await loadImage(Buffer.from(bytes.slice().buffer));
  if (image.width * image.height > 24000000)
    throw new PdfError("This image exceeds 24 megapixels. Resize it before processing.", "LIMIT");
  const { canvas, ctx } = nodeEnv.createCanvas(image.width, image.height);
  (ctx as unknown as { drawImage(image: unknown, x: number, y: number): void }).drawImage(
    image,
    0,
    0,
  );
  const jpeg = /jpe?g/i.test(type);
  return {
    bytes: await nodeEnv.toBytes(canvas, jpeg ? "jpeg" : "png", 0.95),
    type: jpeg ? "image/jpeg" : "image/png",
  };
}
