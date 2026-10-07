import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { saveContent } from "../../../../src/server/store.js";
import { validateContent } from "../../../../src/cms-model.js";
export async function PUT(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let content, version;
  try {
    const data = await jsonBody(request);
    content = validateContent(data.content);
    version = data.version;
    if (!Number.isInteger(version) || version < 1)
      throw new Error("Versi konten tidak valid.");
  } catch (error) {
    return Response.json(
      { error: error.message || "Konten tidak valid." },
      { status: 400 },
    );
  }
  try {
    const result = await saveContent(content, version);
    return result
      ? Response.json(result)
      : Response.json(
          {
            error:
              "Konten sudah berubah di sesi lain. Muat ulang sebelum menyimpan.",
          },
          { status: 409 },
        );
  } catch {
    return apiFailure();
  }
}
