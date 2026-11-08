// Suggestions for a product's spec table in the admin: the names of the
// rows (Merek, Warna, Bahan) and, for each name, the values other products
// already use, so the team picks them instead of typing them again. A
// row's value may hold several values, written "Merah, Hitam".

// Names offered before any product uses them.
export const presetSpecLabels = [
  "Merek",
  "Model",
  "Nomor produk",
  "Jenis",
  "Warna",
  "Ukuran",
  "Bahan",
  "Lensa",
  "Bingkai",
  "Skirt",
  "Tali",
  "Gesper",
  "Berat",
  "Ketebalan",
  "Kedalaman maksimal",
  "Baterai",
  "Garansi",
  "Negara asal",
  "Isi paket",
];
// The quick buttons under the table.
export const quickSpecLabels = ["Merek", "Warna", "Ukuran", "Bahan", "Berat"];

const key = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// "Merah, Hitam" as ["Merah", "Hitam"]. Only a comma and a space split, so
// "1,5 kg" stays one value.
export const splitValues = (text) =>
  String(text ?? "")
    .split(/,\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
export const joinValues = (values) => values.join(", ");

// Unique texts, most used first, then A–Z; the first spelling seen wins.
function ranked(texts) {
  const seen = new Map();
  for (const text of texts) {
    const k = key(text);
    if (!k) continue;
    const entry = seen.get(k) ?? { text, count: 0 };
    entry.count++;
    seen.set(k, entry);
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "id"))
    .map((entry) => entry.text);
}

// Row names: the ones the catalog uses, most used first, then the presets
// it does not use yet.
export function labelChoices(products) {
  const used = ranked(
    (products ?? []).flatMap((p) => (p.specs ?? []).map((row) => row.label)),
  );
  const known = new Set(used.map(key));
  return [...used, ...presetSpecLabels.filter((l) => !known.has(key(l)))];
}

// The values the catalog uses for a row name, most used first.
export function valueChoices(products, label) {
  const wanted = key(label);
  if (!wanted) return [];
  return ranked(
    (products ?? []).flatMap((p) =>
      (p.specs ?? [])
        .filter((row) => key(row.label) === wanted)
        .flatMap((row) => splitValues(row.value)),
    ),
  );
}

// Choices that contain the words typed, ignoring case and accents.
export function matching(choices, query) {
  const q = key(query);
  return q ? choices.filter((choice) => key(choice).includes(q)) : choices;
}
export const sameText = (a, b) => key(a) === key(b);
