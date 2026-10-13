// Dive gear servicing offered by Zanclus: shown on /service, linked from the
// Dive Shop and the About page. Editable in the CMS; prices are starting
// prices for the owner to confirm and change in the admin.
import { cleanWhatsApp, cleanEmail } from "./contact-fields.js";
import { dictionary } from "./i18n.js";
import { pickText, cleanText, cleanMediaURL } from "./bilingual.js";

const t = (id, en) => ({ id, en });
export const serviceLimit = 12;

export const defaultService = {
  image: "/assets/photos/gear.webp",
  items: [
    {
      id: "regulator",
      enabled: true,
      name: t("Servis regulator", "Regulator service"),
      summary: t(
        "Bongkar, bersihkan, dan ganti kit servis first dan second stage, lalu setel tekanan dan uji kebocoran.",
        "Strip, clean and fit a service kit to the first and second stage, then set the pressure and leak test.",
      ),
      duration: t("2 sampai 3 hari", "2 to 3 days"),
      price: 650000,
      unit: t("/ set", "/ set"),
    },
    {
      id: "octopus",
      enabled: true,
      name: t("Servis octopus", "Octopus service"),
      summary: t(
        "Second stage cadangan dibersihkan, O-ring dan diafragma diganti bila perlu, lalu diuji.",
        "The spare second stage is cleaned, O-rings and diaphragm replaced where needed, then tested.",
      ),
      duration: t("1 sampai 2 hari", "1 to 2 days"),
      price: 250000,
      unit: t("/ unit", "/ unit"),
    },
    {
      id: "bcd",
      enabled: true,
      name: t("Servis BCD", "BCD service"),
      summary: t(
        "Inflator, katup buang, dan kantong udara dicek dan dibersihkan, lalu diuji tahan bocor semalam.",
        "Inflator, dump valves and bladder checked and cleaned, then an overnight leak test.",
      ),
      duration: t("1 sampai 2 hari", "1 to 2 days"),
      price: 300000,
      unit: t("/ unit", "/ unit"),
    },
    {
      id: "tank",
      enabled: true,
      name: t("Inspeksi visual tabung", "Visual cylinder inspection"),
      summary: t(
        "Bagian dalam dan luar tabung diperiksa, katup dibersihkan, dan O-ring diganti.",
        "The cylinder is inspected inside and out, the valve cleaned and the O-ring replaced.",
      ),
      duration: t("1 hari", "1 day"),
      price: 150000,
      unit: t("/ tabung", "/ cylinder"),
    },
    {
      id: "computer",
      enabled: true,
      name: t("Ganti baterai komputer selam", "Dive computer battery change"),
      summary: t(
        "Baterai dan O-ring diganti, lalu layar dan sensor dicek. Baterai sesuai model.",
        "Battery and O-ring replaced, then the screen and sensors checked. Battery to suit the model.",
      ),
      duration: t("Hari yang sama", "Same day"),
      price: 150000,
      unit: t("/ unit", "/ unit"),
    },
    {
      id: "repair",
      enabled: true,
      name: t("Perbaikan kecil", "Small repairs"),
      summary: t(
        "Wetsuit sobek, strap masker dan fin, mouthpiece, selang, atau O-ring. Biaya akhir sesuai part.",
        "Torn wetsuits, mask and fin straps, mouthpieces, hoses or O-rings. Final cost depends on the parts.",
      ),
      duration: t("Sesuai pekerjaan", "Depends on the job"),
      price: 50000,
      unit: t("", ""),
    },
  ],
};

export function withService(content) {
  return content.service
    ? content
    : { ...content, service: structuredClone(defaultService) };
}

export const serviceText = pickText;

export function validateService(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultService);
  const items = input.items ?? structuredClone(defaultService.items);
  if (!Array.isArray(items) || items.length > serviceLimit)
    throw new Error(`Servis berisi maksimal ${serviceLimit} item.`);
  const ids = new Set();
  return {
    image: cleanMediaURL(input.image, "Foto servis"),
    items: items.map((s) => {
      const id = String(s?.id ?? "").trim();
      if (!/^[a-z0-9-]{2,40}$/.test(id) || ids.has(id))
        throw new Error("Kode servis harus unik, huruf kecil, angka, atau -.");
      ids.add(id);
      const price = Number(s.price);
      if (!Number.isSafeInteger(price) || price <= 0 || price > 1e9)
        throw new Error("Harga servis harus angka rupiah.");
      return {
        id,
        enabled: s.enabled !== false,
        name: cleanText(s.name, "Nama servis", 80, true),
        summary: cleanText(s.summary, "Keterangan servis", 300, true),
        duration: cleanText(s.duration, "Lama pengerjaan", 60),
        price,
        unit: cleanText(s.unit, "Satuan harga servis", 20),
      };
    }),
  };
}

// WhatsApp message for a gear service request.
export function serviceInquiry(chosen, details, today, locale = "id") {
  const t = dictionary(locale).service;
  const items = chosen.filter((item) => item?.enabled);
  if (!items.length) throw new Error(t.errService);
  const name = typeof details.name === "string" ? details.name.trim() : "";
  if (!name || name.length > 120) throw new Error(t.errName);
  const whatsapp = cleanWhatsApp(details.whatsapp);
  if (!whatsapp) throw new Error(t.errWhatsapp);
  const email = cleanEmail(details.email);
  if (email === null) throw new Error(t.errEmail);
  const date = details.date;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    Number.isNaN(new Date(date + "T12:00:00Z").valueOf()) ||
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date ||
    date < today
  )
    throw new Error(t.errDate);
  const notes = typeof details.notes === "string" ? details.notes.trim() : "";
  if (notes.length > 1000) throw new Error(t.errNotes);
  return [
    t.message.greeting,
    `${t.message.name}: ${name}`,
    `WhatsApp: ${whatsapp}`,
    ...(email ? [`Email: ${email}`] : []),
    `${t.message.services}: ${items.map((item) => pickText(item.name, locale)).join(", ")}`,
    `${t.message.date}: ${date}`,
    ...(notes ? [`${t.message.notes}: ${notes}`] : []),
    t.message.closing,
  ].join("\n");
}
