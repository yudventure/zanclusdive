import { requireAdmin, apiFailure } from "../../../../src/server/auth.js";
import { addMedia } from "../../../../src/server/store.js";
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length") || 0) > 4.5 * 1024 * 1024)
    return Response.json(
      { error: "Ukuran gambar maksimal 4 MB." },
      { status: 413 },
    );
  let file, data, mime;
  try {
    const form = await request.formData();
    file = form.get("file");
    if (
      !file ||
      typeof file.arrayBuffer !== "function" ||
      file.size < 12 ||
      file.size > 4 * 1024 * 1024
    )
      throw new Error("Pilih gambar PNG, JPEG, atau WebP maksimal 4 MB.");
    data = Buffer.from(await file.arrayBuffer());
    if (
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    else if (data[0] === 255 && data[1] === 216 && data[2] === 255)
      mime = "image/jpeg";
    else if (
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP"
    )
      mime = "image/webp";
    else throw new Error("Format gambar tidak didukung. SVG tidak diizinkan.");
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  try {
    return Response.json(
      await addMedia(
        String(file.name)
          .replace(/[^\w .-]/g, "")
          .slice(0, 150) || "gambar",
        mime,
        data,
      ),
      { status: 201 },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
