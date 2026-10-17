import { cleanText, validDate } from "./money.js";

// PR: the content calendar from idea to evaluation, one record per post.
export const platforms = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  website: "Website",
};
export const formats = {
  reel: "Reel / Short",
  foto: "Foto",
  carousel: "Carousel",
  story: "Story",
  video: "Video panjang",
  artikel: "Artikel",
  live: "Live",
};
export const postStatuses = {
  idea: "Ide",
  draft: "Draf",
  scheduled: "Terjadwal",
  published: "Tayang",
  evaluated: "Dievaluasi",
};
export const metricKeys = {
  views: "Tayangan",
  reach: "Jangkauan",
  likes: "Suka",
  comments: "Komentar",
  saves: "Simpan",
  shares: "Bagikan",
};
export const planLimits = { caption: 2000, evaluation: 500 };

export function validatePost(input, current = null) {
  if (!input || typeof input !== "object")
    throw new Error("Data konten tidak valid.");
  const pick = (key) => (key in input ? input[key] : current?.[key]);
  const date = pick("date");
  if (!validDate(date))
    throw new Error("Isi tanggal tayang yang direncanakan.");
  const time = typeof pick("time") === "string" ? pick("time").trim() : "";
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Jam ditulis sebagai JJ:MM.");
  const platform = pick("platform") ?? "instagram";
  if (!(platform in platforms)) throw new Error("Pilih platform.");
  const format = pick("format") ?? "reel";
  if (!(format in formats)) throw new Error("Pilih format konten.");
  const title = cleanText(pick("title"), 120, "Judul");
  if (!title) throw new Error("Isi judul atau ide konten.");
  const status = pick("status") ?? "idea";
  if (!(status in postStatuses)) throw new Error("Pilih status konten.");
  const link = typeof pick("link") === "string" ? pick("link").trim() : "";
  if (link && !/^https:\/\/[^\s<>"]{3,300}$/.test(link))
    throw new Error("Tautan harus diawali https://.");
  const metricsIn = pick("metrics") ?? {};
  const metrics = Object.fromEntries(
    Object.keys(metricKeys).map((key) => {
      const raw = metricsIn[key];
      if (raw === "" || raw === undefined || raw === null) return [key, 0];
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 1e9)
        throw new Error(
          `${metricKeys[key]} harus bilangan bulat 0 atau lebih.`,
        );
      return [key, n];
    }),
  );
  return {
    date,
    time,
    platform,
    format,
    title,
    caption: cleanText(pick("caption"), planLimits.caption, "Caption"),
    status,
    link,
    pic: cleanText(pick("pic"), 60, "Penanggung jawab"),
    metrics,
    evaluation: cleanText(
      pick("evaluation"),
      planLimits.evaluation,
      "Catatan evaluasi",
    ),
  };
}
// Posts per platform and status, and the metrics of what went out.
export function monthSummary(posts, month) {
  const rows = posts.filter((p) => p.date.startsWith(month + "-"));
  const live = rows.filter((p) =>
    ["published", "evaluated"].includes(p.status),
  );
  const count = (list, key, value) =>
    list.filter((p) => p[key] === value).length;
  return {
    month,
    total: rows.length,
    byStatus: Object.fromEntries(
      Object.keys(postStatuses).map((key) => [key, count(rows, "status", key)]),
    ),
    byPlatform: Object.fromEntries(
      Object.keys(platforms).map((key) => [
        key,
        {
          planned: count(rows, "platform", key),
          live: count(live, "platform", key),
        },
      ]),
    ),
    metrics: Object.fromEntries(
      Object.keys(metricKeys).map((key) => [
        key,
        live.reduce((t, p) => t + (p.metrics?.[key] ?? 0), 0),
      ]),
    ),
  };
}
