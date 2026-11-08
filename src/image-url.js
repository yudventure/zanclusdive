// A photo address the site accepts: a bundled asset, an uploaded photo
// (/api/media/<id>) or an HTTPS link without credentials.
export function imageURL(value) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s || s.length > 1200) throw new Error("URL gambar tidak valid.");
  if (s.startsWith("/assets/") || /^\/api\/media\/[a-f0-9-]{36}$/.test(s))
    return s;
  try {
    const url = new URL(s);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {}
  throw new Error("Gambar harus memakai URL HTTPS atau aset website.");
}
