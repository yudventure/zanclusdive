import { defaultContent } from "./cms-model.js";
import { demoShop } from "./shop-model.js";
import { demoSocials } from "./contact-model.js";
// Public demo credentials, never used in MySQL mode.
export const demoAccount = {
  email: "demo@zanclusdive.com",
  password: "ZanclusDemo2026!",
};

// English wording for the demo-only values set in demoSeed.
export function withDemoEnglish(content) {
  const en = structuredClone(content.en);
  en.contact.location = "Waisai, Raja Ampat, Southwest Papua";
  en.experiences.beginner.duration = "Half day";
  en.experiences.explorer.duration = "2 dives";
  en.experiences.specialty.duration = "1 day";
  return { ...content, en };
}

// Sample bookings are only for local tests (CMS_DEMO_LOGIN); a live site
// starts with an empty reservation list.
export function demoSeed(now = new Date(), { sampleBookings = true } = {}) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" });
  const content = structuredClone(defaultContent);
  content.shop = demoShop();
  Object.assign(content.contact, demoSocials);
  content.contact.email = "halo@zanclusdive.com";
  content.contact.location = "Waisai, Raja Ampat, Papua Barat Daya";
  content.experiences.beginner.price = 900000;
  content.experiences.beginner.duration = "Setengah hari";
  content.experiences.explorer.price = 1500000;
  content.experiences.explorer.duration = "2 penyelaman";
  content.experiences.specialty.price = 1800000;
  content.experiences.specialty.duration = "1 hari";
  return {
    contactDefaultsVersion: 1,
    content: withDemoEnglish(content),
    version: 1,
    media: [],
    failures: { attempts: 0, windowStart: 0 },
    bookings: (sampleBookings ? ["beginner", "explorer", "specialty"] : []).map(
      (experience, index) => {
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
          notes:
            "Reservasi contoh untuk mencoba CMS; bukan pemesanan sungguhan.",
          updatedAt: now.toISOString(),
        };
      },
    ),
  };
}

// Removes the sample labels and sample bookings that older versions wrote
// into the saved data, so nothing on the live site reads as a demo.
const sampleLabel =
  /\s*(?:·|—|-)\s*(?:lokasi contoh demo|contoh demo|sample demo location|demo sample)/gi;
export const sampleBookingIds = [1, 2, 3].map(
  (n) => `00000000-0000-4000-8000-00000000000${n}`,
);
function cleanText(value) {
  if (typeof value === "string") return value.replace(sampleLabel, "");
  if (Array.isArray(value)) return value.map(cleanText);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanText(item)]),
    );
  return value;
}
export function withoutSamples(state) {
  return {
    ...state,
    content: cleanText(state.content),
    bookings: state.bookings.filter(
      (booking) =>
        !(
          sampleBookingIds.includes(booking.id) &&
          booking.guestName.startsWith("Tamu Demo")
        ),
    ),
  };
}
