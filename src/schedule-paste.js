// A schedule pasted from a chat or a note, one trip a line, read into
// reservations: "29 Okt sd 01 Nov (12 Divers)", "15-19 Nov (2 Divers)",
// "30 nov - 05 des (2 Divers)". Months in Indonesian or English, the year
// when it is written, else the coming one: a date more than a month gone
// this year is next year's. The end date counts as a day of the trip.
const months = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  peb: 2,
  februari: 2,
  february: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  agu: 8,
  agt: 8,
  ags: 8,
  agus: 8,
  agustus: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  october: 10,
  nov: 11,
  nop: 11,
  november: 11,
  des: 12,
  desember: 12,
  dec: 12,
  december: 12,
};
export const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const day = String.raw`(\d{1,2})`;
const month = String.raw`([a-z]{3,9})\.?`;
const year = String.raw`(?:\s*(\d{4}))?`;
const until = String.raw`(?:s\s*[./]?\s*d\.?|sampai|hingga|until|till|to|[-–—])`;
const range = new RegExp(
  String.raw`^${day}(?:\s*${month})?${year}\s*${until}\s*${day}\s*${month}${year}`,
  "i",
);
const single = new RegExp(String.raw`^${day}\s*${month}${year}`, "i");
const people = new RegExp(
  String.raw`(\d{1,3})\s*(?:divers?|penyelam|pax|orang|org|tamu|guests?|people|persons?|peserta)\b`,
  "i",
);
// The kind of trip, from the words of the line.
const kinds = [
  [/snorkel/i, "snorkeling"],
  [/\btrip\b|island|pulau/i, "trip"],
  [/kursus|course|open water|lisensi/i, "course"],
];

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const real = (y, m, d) => {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};
const shift = (date, days) =>
  new Date(Date.parse(date + "T00:00:00Z") + days * 864e5)
    .toISOString()
    .slice(0, 10);
const monthOf = (word) => (word ? months[word.toLowerCase()] : undefined);

// One line, or null for a blank one. Returns { line, startDate, endDate,
// participants, guestName, experience, warning } or { line, error }.
export function readScheduleLine(raw, today) {
  const line = String(raw ?? "").trim();
  const text = line.replace(/^(?:[-•*]|\d{1,2}[.)])\s+/, "");
  if (!text) return null;
  let m = text.match(range);
  let start, end, rest, warning;
  if (m) {
    const [, d1, m1word, y1, d2, m2word, y2] = m;
    const m2 = monthOf(m2word);
    const m1 = m1word ? monthOf(m1word) : m2;
    if (!m1 || !m2) return { line, error: "Bulan belum terbaca." };
    start = { y: Number(y1) || 0, m: m1, d: Number(d1) };
    end = { y: Number(y2) || 0, m: m2, d: Number(d2) };
  } else if ((m = text.match(single))) {
    const [, d1, m1word, y1] = m;
    const m1 = monthOf(m1word);
    if (!m1) return { line, error: "Bulan belum terbaca." };
    start = { y: Number(y1) || 0, m: m1, d: Number(d1) };
    end = { ...start };
  } else return { line, error: "Tanggal belum terbaca." };
  rest = text.slice(m[0].length);
  const thisYear = Number(today.slice(0, 4));
  if (!start.y && end.y) {
    // The year written once, at the end, as 29 Okt sd 1 Nov 2026.
    start.y = end.y;
    if (start.m > end.m) start.y--;
  } else if (!start.y) {
    start.y = thisYear;
    // A date more than a month gone is next year's.
    if (iso(start.y, start.m, start.d) < shift(today, -31)) start.y++;
  }
  if (!end.y) {
    end.y = start.y;
    // Into the next year, as 30 Des sd 03 Jan.
    if (end.m < start.m) end.y++;
  }
  if (!real(start.y, start.m, start.d) || !real(end.y, end.m, end.d))
    return { line, error: "Tanggal itu tidak ada di kalender." };
  let startDate = iso(start.y, start.m, start.d);
  let endDate = iso(end.y, end.m, end.d);
  if (endDate < startDate) {
    // Most likely the end is in the next month, as 27 Des sd 01 Jan.
    const next =
      end.m === 12 ? { y: end.y + 1, m: 1 } : { y: end.y, m: end.m + 1 };
    if (end.m === start.m && real(next.y, next.m, end.d)) {
      endDate = iso(next.y, next.m, end.d);
      warning = `Tanggal selesai lebih awal dari tanggal mulai, jadi dibaca sampai ${end.d} ${monthNames[next.m - 1]} ${next.y}. Periksa lagi.`;
    } else
      return { line, error: "Tanggal selesai lebih awal dari tanggal mulai." };
  }
  const count = rest.match(people);
  const participants = count ? Number(count[1]) : 1;
  if (participants < 1 || participants > 100)
    return { line, error: "Jumlah peserta harus 1 sampai 100." };
  const name = rest
    .replace(people, "")
    .replace(/[()[\]]/g, " ")
    .replace(/^[\s,.:;–—-]+|[\s,.:;–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return {
    line,
    startDate,
    endDate,
    participants,
    guestName:
      name ||
      `Grup ${participants} ${/divers?|penyelam/i.test(rest) || !count ? "penyelam" : "tamu"}`,
    experience: kinds.find(([rule]) => rule.test(text))?.[1] ?? "diving",
    ...(warning ? { warning } : {}),
  };
}

export const readSchedule = (text, today) =>
  String(text ?? "")
    .split(/\r?\n/)
    .map((line) => readScheduleLine(line, today))
    .filter(Boolean)
    .slice(0, 60);

// "29 Okt 2026 sampai 1 Nov 2026, 4 hari", for the preview.
export function scheduleDates(startDate, endDate) {
  const show = (date) =>
    `${Number(date.slice(8))} ${monthNames[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
  const days =
    Math.round((Date.parse(endDate) - Date.parse(startDate)) / 864e5) + 1;
  return startDate === endDate
    ? `${show(startDate)}, 1 hari`
    : `${show(startDate)} sampai ${show(endDate)}, ${days} hari`;
}
