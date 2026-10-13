// Texts the owner edits in Indonesian and English side by side ({ id, en }),
// used by the About and gear service pages.

// Text in the page language, falling back to Indonesian.
export const pickText = (value, locale) =>
  (locale === "en" && value?.en?.trim()) || value?.id || "";

export function cleanText(value, label, max, required = false) {
  const out = {};
  for (const lang of ["id", "en"]) {
    const v = value?.[lang] ?? "";
    if (
      typeof v !== "string" ||
      v.length > max ||
      (required && lang === "id" && !v.trim())
    )
      throw new Error(`${label} tidak valid (maksimal ${max} karakter).`);
    out[lang] = v.trim();
  }
  return out;
}

// A bundled photo, an uploaded one, or an HTTPS address.
export function cleanMediaURL(value, label) {
  const url = String(value ?? "").trim();
  if (
    url.length > 1200 ||
    (url &&
      !url.startsWith("/assets/") &&
      !url.startsWith("/api/media/") &&
      !url.startsWith("https://"))
  )
    throw new Error(`${label} harus URL HTTPS atau foto yang diunggah.`);
  return url;
}
