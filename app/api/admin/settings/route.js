import {
  requireAdmin,
  currentAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { saveContent, getContent } from "../../../../src/server/store.js";
import { validateContent } from "../../../../src/cms-model.js";
import { hasArea, mergeByRole } from "../../../../src/roles.js";
import { shopLinks, syncShopStock } from "../../../../src/server/shop-stock.js";
// Site content is one document; the parts a role may not change (developer
// locks, the payment switch) are kept as they are stored.
const editors = ["website", "settings", "payments"];
export async function PUT(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const admin = await currentAdmin();
  if (!editors.some((area) => hasArea(admin.role, area)))
    return Response.json(
      { error: "Peran ini tidak bisa mengubah isi website." },
      { status: 403 },
    );
  let content, version, links;
  try {
    // The whole site document (texts, calendar, gallery, courses) is larger
    // than other admin payloads.
    const data = await jsonBody(request, 400000);
    content = validateContent(data.content);
    // The warehouse items picked in the Dive Shop editor.
    links = hasArea(admin.role, "website") ? shopLinks(data.content) : [];
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
    if (!editors.every((area) => hasArea(admin.role, area)))
      content = mergeByRole(admin.role, content, (await getContent()).content);
    const result = await saveContent(content, version);
    // Every Dive Shop product keeps its item in the warehouse. The catalog
    // is saved even when the warehouse cannot be updated now; the next
    // visit to Gudang or the Dive Shop editor tries again.
    if (result)
      await syncShopStock({ links }).catch((error) =>
        console.error("Dive Shop items not synced:", error?.message),
      );
    return result
      ? Response.json(result)
      : Response.json(
          {
            error:
              "Konten sudah berubah di sesi lain. Muat ulang sebelum menyimpan.",
          },
          { status: 409 },
        );
  } catch (error) {
    return apiFailure(error);
  }
}
