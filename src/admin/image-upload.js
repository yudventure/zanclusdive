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
    if (!blob || blob.type !== "image/webp")
      blob = await encode(canvas, "image/jpeg", quality);
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
    `${base}.${blob.type === "image/webp" ? "webp" : "jpg"}`,
    {
      type: blob.type,
    },
  );
}
