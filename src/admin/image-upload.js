// Prepares a photo picked on a computer or phone for the media upload:
// large camera pictures are scaled down and re-encoded in the browser so they
// stay under the 4 MB upload limit and load quickly on the website.
export const uploadLimit = 4 * 1024 * 1024;
const maxSide = 2400;
const accepted = ["image/jpeg", "image/png", "image/webp"];

async function encode(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file) {
  if (!file || !file.type.startsWith("image/"))
    throw new Error("Pilih file foto (JPG, PNG, atau WebP).");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (accepted.includes(file.type) && file.size <= uploadLimit) return file;
    throw new Error(
      "Foto ini tidak bisa dibaca browser. Simpan sebagai JPG lalu coba lagi.",
    );
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  // Small files that already fit are uploaded untouched.
  if (scale === 1 && accepted.includes(file.type) && file.size <= 900 * 1024) {
    bitmap.close?.();
    return file;
  }
  let width = Math.round(bitmap.width * scale),
    height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  let blob = null;
  for (const quality of [0.86, 0.78, 0.68, 0.6]) {
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    blob = await encode(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      // Without WebP, a PNG keeps its transparency as PNG while it fits.
      blob =
        file.type === "image/png" ? await encode(canvas, "image/png") : null;
      if (!blob || blob.type !== "image/png" || blob.size > uploadLimit)
        blob = await encode(canvas, "image/jpeg", quality);
    }
    if (blob && blob.size <= uploadLimit) break;
    width = Math.round(width * 0.8);
    height = Math.round(height * 0.8);
  }
  bitmap.close?.();
  if (!blob || blob.size > uploadLimit)
    throw new Error("Foto terlalu besar. Coba foto lain.");
  const base = (file.name || "foto").replace(/\.[^.]+$/, "").slice(0, 120);
  return new File(
    [blob],
    `${base}.${{ "image/webp": "webp", "image/png": "png" }[blob.type] ?? "jpg"}`,
    {
      type: blob.type,
    },
  );
}

// Logos keep their transparency. Empty transparent edges are trimmed so the
// mark fills its place, the result is at most 800 px as PNG, and its colours
// decide how the dark course section shows it: a dark one-colour logo would
// disappear, so it is shown white; any other logo keeps its own colours.
const logoSide = 800;
export function logoStyle(pixels) {
  let solid = 0,
    light = 0,
    colourful = 0,
    clear = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 250) clear++;
    if (a < 128) continue;
    const r = pixels[i] / 255,
      g = pixels[i + 1] / 255,
      b = pixels[i + 2] / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    solid++;
    if (lum > 0.55) light++;
    if (max - min > 0.25 && max > 0.2) colourful++;
  }
  // A logo without transparency (a JPG on a white card) stays as it is.
  if (!clear || !solid) return "color";
  return light / solid < 0.15 && colourful / solid < 0.08 ? "white" : "color";
}
export async function prepareLogo(file) {
  if (!file || !file.type.startsWith("image/"))
    throw new Error("Pilih file logo (PNG, WebP, atau JPG).");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Logo ini tidak bisa dibaca browser. Simpan sebagai PNG lalu coba lagi.",
    );
  }
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)),
    height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const pixels = context.getImageData(0, 0, width, height).data;
  let top = height,
    left = width,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (pixels[(y * width + x) * 4 + 3] > 16) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  if (right < 0)
    throw new Error("Logo ini kosong: seluruh gambarnya transparan.");
  const style = logoStyle(pixels);
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.02);
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  const cropW = Math.min(width, right + pad + 1) - left,
    cropH = Math.min(height, bottom + pad + 1) - top;
  const fit = Math.min(1, logoSide / Math.max(cropW, cropH));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cropW * fit));
  out.height = Math.max(1, Math.round(cropH * fit));
  out
    .getContext("2d")
    .drawImage(canvas, left, top, cropW, cropH, 0, 0, out.width, out.height);
  let blob = await encode(out, "image/png");
  if (!blob || blob.size > uploadLimit)
    blob = await encode(out, "image/webp", 0.9);
  if (!blob || blob.size > uploadLimit)
    throw new Error("Logo terlalu besar. Coba file lain.");
  const base = (file.name || "logo").replace(/\.[^.]+$/, "").slice(0, 120);
  const ext = blob.type === "image/webp" ? "webp" : "png";
  return {
    file: new File([blob], `${base}.${ext}`, { type: blob.type }),
    style,
    ratio: out.width / out.height,
  };
}
