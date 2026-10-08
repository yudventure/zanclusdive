import { defaultContent } from "./cms-model.js";
import { demoShop } from "./shop-model.js";
// Public demo credentials, never used in MySQL mode.
export const demoAccount = {
  email: "demo@zanclusdive.com",
  password: "ZanclusDemo2026!",
};

export function demoSeed(now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" });
  const content = structuredClone(defaultContent);
  content.shop = demoShop();
  content.contact.email = "halo@zanclusdive.com";
  content.contact.location =
    "Raja Ampat, Papua Barat Daya — lokasi contoh demo";
  content.experiences.beginner.price = 900000;
  content.experiences.beginner.duration = "Setengah hari · contoh demo";
  content.experiences.explorer.price = 1500000;
  content.experiences.explorer.duration = "2 penyelaman · contoh demo";
  content.experiences.specialty.price = 1800000;
  content.experiences.specialty.duration = "1 hari · contoh demo";
  return {
    content,
    version: 1,
    media: [],
    failures: { attempts: 0, windowStart: 0 },
    bookings: ["beginner", "explorer", "specialty"].map((experience, index) => {
      const start = new Date(today + "T12:00:00Z");
      start.setUTCDate(start.getUTCDate() + index * 2);
      const date = start.toISOString().slice(0, 10);
      return {
        id: `00000000-0000-4000-8000-00000000000${index + 1}`,
        experience,
        status: index === 1 ? "pending" : "confirmed",
        source: "website",
        startDate: date,
        endDate: date,
        guestName: `Tamu Demo 0${index + 1}`,
        phone: "",
        participants: index + 1,
        amount: content.experiences[experience].price * (index + 1),
        notes: "Reservasi contoh untuk mencoba CMS; bukan pemesanan sungguhan.",
        updatedAt: now.toISOString(),
      };
    }),
  };
}
