// A product's full description is Markdown, written by hand or taken from
// the maker's own page: the team resells gear, so the maker's words and
// specifications are the best source. It is read here into blocks the
// product window shows tidily: headings, paragraphs, lists, tables, quotes,
// a tagline banner and feature cards. Nothing is ever read as HTML.
import { productLimits } from "./shop-model.js";

// Sections whose bold lines or small headings become feature cards.
const featureSection =
  /feature|fitur|keunggulan|kelebihan|highlight|benefit|manfaat|unggulan/i;
// Sections whose two-column table is the product's specifications.
const specSection = /spec|spesifikasi|teknis|technical|detail/i;

// Inline marks: **bold**, *italic*, `code` and [text](https://link).
export function inlineParts(text) {
  const out = [];
  const pattern =
    /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > last)
      out.push({ type: "text", text: text.slice(last, match.index) });
    if (match[1] !== undefined || match[2] !== undefined)
      out.push({ type: "strong", text: match[1] ?? match[2] });
    else if (match[3] !== undefined) out.push({ type: "em", text: match[3] });
    else if (match[4] !== undefined) out.push({ type: "code", text: match[4] });
    else out.push({ type: "link", text: match[5], href: match[6] });
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}
// The words alone, without their marks.
export const plainText = (text) =>
  inlineParts(String(text ?? ""))
    .map((part) => part.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
// A line that is only bold, such as "**Ultra-clear glass**", or null.
const boldOnly = (text) =>
  text.match(/^\*\*([^*]+)\*\*:?$/)?.[1].trim() ??
  text.match(/^__([^_]+)__:?$/)?.[1].trim() ??
  null;

function tableBlock(lines) {
  const rows = lines.map((line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim()),
  );
  const rule = (row) => row.every((cell) => /^:?-{2,}:?$/.test(cell));
  const head = rows.length > 1 && rule(rows[1]) ? rows[0] : null;
  return {
    type: "table",
    head,
    rows: rows.filter((row, i) => !rule(row) && !(head && i === 0)),
  };
}

// The Markdown as plain blocks, in order.
function rawBlocks(markdown) {
  const lines = String(markdown ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let para = null;
  let list = null;
  let quote = null;
  let table = null;
  const close = () => {
    // A bold first line over more text is a title over its paragraph.
    if (para?.length > 1 && boldOnly(para[0]))
      blocks.push(
        { type: "paragraph", text: para[0] },
        { type: "paragraph", text: para.slice(1).join(" ") },
      );
    else if (para) blocks.push({ type: "paragraph", text: para.join(" ") });
    if (list) blocks.push(list);
    if (quote) blocks.push({ type: "quote", text: quote.join(" ") });
    if (table) blocks.push(tableBlock(table));
    para = list = quote = table = null;
  };
  for (const line of lines) {
    const text = line.trim();
    // Blank lines end a block; rules and pictures are left out (photos
    // have their own place, and the page draws no lines).
    if (
      !text ||
      /^(-{3,}|\*{3,}|_{3,})$/.test(text) ||
      /^!\[[^\]]*\]\([^)]*\)$/.test(text)
    ) {
      close();
      continue;
    }
    const heading = text.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      close();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      continue;
    }
    if (text.startsWith("|")) {
      if (!table) close();
      (table ??= []).push(text);
      continue;
    }
    const quoted = text.match(/^>\s?(.*)$/);
    if (quoted) {
      if (!quote) close();
      (quote ??= []).push(quoted[1]);
      continue;
    }
    const bullet = text.match(/^[-*+•]\s+(.+)$/);
    const numbered = text.match(/^\d{1,3}[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        close();
        list = { type: "list", ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)[1]);
      continue;
    }
    // An indented line goes on with the list item above it.
    if (list && /^\s{2,}/.test(line)) {
      list.items[list.items.length - 1] += " " + text;
      continue;
    }
    if (list || quote || table) close();
    (para ??= []).push(text);
  }
  close();
  return blocks;
}

// The first top heading of the Markdown, the product's name on the maker's
// page.
export function storyTitle(markdown) {
  const first = rawBlocks(markdown)[0];
  return first?.type === "heading" && first.level === 1
    ? plainText(first.text)
    : "";
}

// The blocks the product window shows. The first top heading is left out
// (the window shows the product's name). A bold line followed by a
// paragraph, and in a features section a small heading and its paragraph
// or a list whose items all start in bold, become feature cards. A bold
// line on its own, a bold sentence, or the bold line that opens the
// description is a tagline.
export function storyBlocks(markdown) {
  const raw = rawBlocks(markdown);
  if (raw[0]?.type === "heading" && raw[0].level === 1) raw.shift();
  const out = [];
  let section = "";
  const feature = (title, text) => {
    const last = out[out.length - 1];
    const item = { title: plainText(title), text };
    if (last?.type === "features") last.items.push(item);
    else out.push({ type: "features", items: [item] });
  };
  for (let i = 0; i < raw.length; i++) {
    const block = raw[i];
    const next = raw[i + 1];
    const story = next?.type === "paragraph" && !boldOnly(next.text);
    if (block.type === "heading") {
      if (block.level <= 2) section = plainText(block.text);
      if (block.level >= 3 && featureSection.test(section) && story) {
        feature(block.text, next.text);
        i++;
        continue;
      }
      out.push({ ...block, text: plainText(block.text) });
      continue;
    }
    const lead =
      block.type === "paragraph"
        ? boldOnly(block.text)
        : block.type === "list" && block.items.length === 1
          ? boldOnly(block.items[0])
          : null;
    // A feature's title is short and no sentence; a bold sentence, or the
    // bold line that opens the description, is the tagline.
    const title =
      lead && out.length > 0 && lead.length <= 70 && !/[.!?]$/.test(lead);
    if (title && story) {
      feature(lead, next.text);
      i++;
      continue;
    }
    // In a features section, "**Title** text" on one line is a feature too.
    const inline =
      block.type === "paragraph" &&
      featureSection.test(section) &&
      block.text.match(/^\*\*([^*]+)\*\*\s*[:.–-]?\s*(\S.*)$/);
    if (inline) {
      feature(inline[1], inline[2]);
      continue;
    }
    if (
      block.type === "list" &&
      featureSection.test(section) &&
      !block.ordered &&
      block.items.length > 1 &&
      block.items.every((item) => /^\*\*[^*]+\*\*\s*[:.–-]?\s*\S/.test(item))
    ) {
      for (const item of block.items) {
        const [, title, text] = item.match(
          /^\*\*([^*]+)\*\*\s*[:.–-]?\s*(.*)$/,
        );
        feature(title, text);
      }
      continue;
    }
    if (lead) {
      out.push({ type: "tagline", text: lead });
      continue;
    }
    out.push(block);
  }
  return out;
}

// --- Reading a product file uploaded in the admin -----------------------

const metaKeys = {
  nama: "name",
  name: "name",
  judul: "name",
  title: "name",
  deskripsi: "description",
  description: "description",
  ringkas: "description",
  short: "description",
  ringkasan: "specification",
  summary: "specification",
  spesifikasi: "specification",
  specification: "specification",
  bahasa: "lang",
  lang: "lang",
  language: "lang",
  video: "videos",
  videos: "videos",
};
const languages = {
  id: "id",
  indonesia: "id",
  "bahasa indonesia": "id",
  en: "en",
  english: "en",
  inggris: "en",
};
const unquote = (value) =>
  value
    .trim()
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .trim();

// The file split into sections, each with its front matter: a "---" line,
// lines of "key: value", and another "---" line. A file without front
// matter is one section.
function sections(text) {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let current = { meta: {}, body: [] };
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      let end = -1;
      for (let j = i + 1; j < Math.min(lines.length, i + 40); j++) {
        if (lines[j].trim() === "---") {
          end = j;
          break;
        }
        if (lines[j].trim() && !/^\s*([\w ]+:|-\s)/.test(lines[j])) break;
      }
      const inner = end > i ? lines.slice(i + 1, end) : [];
      if (end > i && inner.some((line) => /^\s*[\w ]+:/.test(line))) {
        if (current.body.join("").trim() || Object.keys(current.meta).length)
          out.push(current);
        const meta = {};
        let listKey = "";
        for (const line of inner) {
          const pair = line.match(/^\s*([\w ]+?)\s*:\s*(.*)$/);
          const item = line.match(/^\s*-\s+(.*)$/);
          if (pair) {
            listKey = metaKeys[pair[1].toLowerCase()] ?? "";
            if (!listKey) continue;
            if (listKey === "videos")
              meta.videos = [
                ...(meta.videos ?? []),
                ...pair[2].split(/[\s,]+/).filter(Boolean),
              ];
            else meta[listKey] = unquote(pair[2]);
          } else if (item && listKey === "videos")
            meta.videos = [...(meta.videos ?? []), unquote(item[1])];
        }
        current = { meta, body: [] };
        i = end;
        continue;
      }
    }
    current.body.push(lines[i]);
  }
  if (current.body.join("").trim() || Object.keys(current.meta).length)
    out.push(current);
  return out;
}

// The specifications table of a description: a two-column table under a
// specifications heading, or else the only two-column table. Its rows
// become the product's spec rows, and it leaves the description, together
// with its heading when nothing else is under it.
function takeSpecs(body) {
  const lines = [...body];
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) continue;
    let end = i;
    while (end + 1 < lines.length && lines[end + 1].trim().startsWith("|"))
      end++;
    let h = i - 1;
    while (h >= 0 && !lines[h].trim()) h--;
    const heading = lines[h]?.trim().match(/^#{1,6}\s+(.+)$/)?.[1] ?? "";
    tables.push({ start: i, end, heading, headingLine: heading ? h : -1 });
    i = end;
  }
  const twoColumns = tables.filter((t) => {
    const block = tableBlock(lines.slice(t.start, t.end + 1));
    return block.rows.length && block.rows.every((row) => row.length === 2);
  });
  const chosen =
    twoColumns.find((t) => specSection.test(t.heading)) ??
    (twoColumns.length === 1 ? twoColumns[0] : null);
  if (!chosen) return { body: lines.join("\n"), specs: [] };
  const rows = tableBlock(lines.slice(chosen.start, chosen.end + 1)).rows;
  if (rows.length > productLimits.specs)
    return { body: lines.join("\n"), specs: [] };
  const specs = rows
    .map(([label, value]) => ({
      label: plainText(label).slice(0, 40),
      value: plainText(value).slice(0, 160),
    }))
    .filter((row) => row.label && row.value);
  // Drop the heading too when the table was all its section held.
  let after = chosen.end + 1;
  while (after < lines.length && !lines[after].trim()) after++;
  const alone =
    chosen.headingLine >= 0 &&
    specSection.test(chosen.heading) &&
    (after >= lines.length || /^#{1,6}\s/.test(lines[after].trim()));
  lines.splice(chosen.start, chosen.end - chosen.start + 1);
  if (alone) lines.splice(chosen.headingLine, 1);
  return { body: lines.join("\n"), specs };
}

// A product file read for the admin: one entry per section, with its
// language ("" when the file does not say), the fields its front matter
// gives (name, short description, summary line, videos), the full
// description and the spec rows of its specifications table, and the
// title of its first heading.
export function readProductMd(text) {
  const found = sections(String(text ?? ""));
  if (!found.length) throw new Error("Berkas .md masih kosong.");
  return found.map(({ meta, body }) => {
    const lang = languages[String(meta.lang ?? "").toLowerCase()] ?? "";
    const { body: rest, specs } = takeSpecs(body);
    const details = rest.replace(/\n{3,}/g, "\n\n").trim();
    if (details.length > productLimits.details)
      throw new Error(
        `Deskripsi di berkas terlalu panjang, maksimal ${productLimits.details.toLocaleString("id-ID")} karakter.`,
      );
    return {
      lang,
      title: storyTitle(details),
      ...(meta.name ? { name: meta.name.slice(0, 100) } : {}),
      ...(meta.description
        ? { description: meta.description.slice(0, 500) }
        : {}),
      ...(meta.specification
        ? { specification: meta.specification.slice(0, 300) }
        : {}),
      videos: meta.videos ?? [],
      details,
      specs,
    };
  });
}

// An example file for the admin to download and fill in.
export const productMdExample = `---
bahasa: id
nama: SCUBAPRO Crystal Vu Plus
deskripsi: Masker panorama tiga jendela dengan kaca bening tanpa warna.
ringkasan: Tiga jendela, kaca tanpa warna, skirt silikon
---
# SCUBAPRO Crystal Vu Plus

**Pandangan luas. Kaca sangat jernih. Nyaman dipakai lama.**

Paragraf pembuka tentang produk, diambil dari situs resmi pembuatnya.

## Fitur utama

**Desain tiga jendela**
Lensa depan besar dan dua jendela samping membuat pandangan jauh lebih luas.

**Kaca bening tanpa warna**
Warna terumbu terlihat seperti aslinya.

## Spesifikasi

| Spesifikasi | Keterangan |
|---|---|
| Lensa | Kaca tempered tanpa warna |
| Skirt | Silikon dua lapis |
| Berat | Sekitar 250 g |

---
bahasa: en
nama: SCUBAPRO Crystal Vu Plus
deskripsi: A three-window panoramic mask with clear, untinted glass.
ringkasan: Three windows, untinted glass, silicone skirt
---
# SCUBAPRO Crystal Vu Plus

**Panoramic vision. Exceptional clarity. All-day comfort.**

An opening paragraph about the product, taken from the maker's site.

## Key features

**Three-window design**
A large front lens and two side windows widen the view.

**Untinted glass**
Reef colours look as they really are.

## Specifications

| Specification | Details |
|---|---|
| Lens | Untinted tempered glass |
| Skirt | Double silicone |
| Weight | About 250 g |
`;
