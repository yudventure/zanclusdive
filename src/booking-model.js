import { experienceKeys, validateBooking } from "./cms-model.js";

export class BookingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Public booking errors are written in Indonesian; English visitors get these.
const englishErrors = {
  "Data booking tidak valid.": "Invalid booking data.",
  "Permintaan tidak valid. Muat ulang halaman lalu coba lagi.":
    "Invalid request. Reload the page and try again.",
  "Permintaan tidak dapat diproses.": "This request can't be processed.",
  "Periksa nama dan catatan booking.":
    "Please check the name and notes for your booking.",
  "Isi nomor WhatsApp yang dapat dihubungi, termasuk kode negara.":
    "Enter a WhatsApp number we can reach, including the country code.",
  "Jumlah peserta harus 1–30 orang.": "Participants must be between 1 and 30.",
  "Pilih tanggal mulai hari ini hingga satu tahun ke depan (WIT).":
    "Choose a date from today up to one year ahead (WIT).",
  "Program ini belum menerima booking. Pilih program lain.":
    "This program isn't taking bookings yet. Please choose another program.",
  "Tanggal ini sudah ditutup untuk program yang dipilih. Silakan pilih tanggal lain.":
    "This date is closed for the selected program. Please choose another date.",
  "Pilih cara pengambilan pesanan.": "Choose how to receive your order.",
  "Pilih wilayah antar.": "Choose a delivery area.",
  "Isi alamat antar, 5–300 karakter.":
    "Enter the delivery address, 5 to 300 characters.",
  "Pilih ukuran untuk setiap alat sebelum membayar.":
    "Choose a size for each item before paying.",
  "Alat sewa pesanan ini sudah penuh dipesan pada tanggal itu. Pilih tanggal lain.":
    "The rental gear in this booking is fully booked on that date. Please choose another date.",
  "Program atau bulan kalender tidak valid.":
    "Invalid program or calendar month.",
  "Bulan berada di luar rentang booking.":
    "That month is outside the booking window.",
  "Permintaan ini sudah dikirim. Buat booking baru untuk data berbeda.":
    "This request was already sent. Make a new booking for different details.",
  "Terlalu banyak percobaan booking. Coba lagi dalam 15 menit atau hubungi WhatsApp.":
    "Too many booking attempts. Try again in 15 minutes or contact us on WhatsApp.",
  "Data booking tidak valid atau terlalu besar.":
    "Booking data is invalid or too large.",
  "Booking belum dapat disimpan. Coba lagi atau hubungi tim melalui WhatsApp.":
    "The booking couldn't be saved. Try again or contact our team on WhatsApp.",
  "Data pembayaran tidak valid.": "Invalid payment details.",
  "Pembayaran online belum tersedia. Silakan chat tim kami lewat WhatsApp.":
    "Online payment isn't available yet. Please chat with our team on WhatsApp.",
  "Aktivitas ini belum bisa dibayar online.":
    "This activity can't be paid online yet.",
  "Daftar harga baru saja diperbarui. Muat ulang halaman.":
    "The price list was just updated. Please reload the page.",
  "Jumlah paket dan peserta harus 1–30.":
    "Quantity and participants must be between 1 and 30.",
  "Isi nama, maksimal 80 karakter.": "Enter your name, up to 80 characters.",
  "Format email belum benar.": "That email doesn't look right.",
  "Catatan maksimal 1.000 karakter.": "Notes can be up to 1,000 characters.",
  "Slot tanggal ini sudah penuh. Silakan pilih tanggal lain.":
    "This date is fully booked. Please choose another date.",
  "Pilih minimal satu paket dari daftar harga.":
    "Choose at least one package from the price list.",
  "Event ini sudah tidak menerima pendaftaran. Muat ulang halaman.":
    "This event is no longer taking sign-ups. Please reload the page.",
  "Add-on dipesan bersama minimal satu paket utama.":
    "Add-ons come with at least one main package.",
  "Pilih alat terlebih dahulu.": "Choose your gear first.",
  "Lama sewa harus 1–30 hari.": "Rental days must be between 1 and 30.",
  "Jumlah setiap alat harus 1–10.": "Each item can be 1 to 10 units.",
  "Ada alat yang belum tersedia. Muat ulang halaman.":
    "Some gear isn't available. Please reload the page.",
  "Ada alat yang harganya dikonfirmasi tim. Kirim pesanan lewat WhatsApp.":
    "Some gear is priced by our team. Please send the order on WhatsApp.",
  "Kursus ini belum bisa dibayar online.":
    "This course can't be paid online yet.",
  "Jumlah peserta kursus harus 1–20.":
    "Course participants must be between 1 and 20.",
  "Pilih servis terlebih dahulu.": "Choose a service first.",
  "Servis ini belum bisa dibayar online.":
    "This service can't be paid online yet.",
  "Pembayaran belum bisa dibuat. Coba lagi sebentar, atau chat tim kami lewat WhatsApp.":
    "The payment couldn't be created. Try again shortly, or chat with our team on WhatsApp.",
};
export function bookingErrorMessage(message, locale) {
  if (locale !== "en") return message;
  const least = /^Event ini untuk minimal (\d+) peserta/.exec(message);
  if (least) return `This event is for groups of at least ${least[1]}.`;
  const left = /^Slot tanggal ini tinggal (\d+) orang/.exec(message);
  if (left)
    return `Only ${left[1]} ${left[1] === "1" ? "place is" : "places are"} left on this date. Choose fewer participants or another date.`;
  // Dive Shop gear that follows the warehouse stock.
  const sized = (name) => name.replace(/ ukuran (\S+)$/, " size $1");
  const stock = /^Stok (.+) tinggal (\d+)( untuk tanggal itu)?\./.exec(message);
  if (stock)
    return stock[3]
      ? `Only ${stock[2]} left of ${sized(stock[1])} for those dates. Choose fewer or other dates.`
      : `Only ${stock[2]} left of ${sized(stock[1])}. Choose fewer.`;
  const gone = /^(.+) sedang habis\./.exec(message);
  if (gone)
    return `${sized(gone[1])} is out of stock. Remove it from your order or chat with our team on WhatsApp.`;
  return englishErrors[message] ?? "Please check your booking details.";
}

// Daily places: the dive center takes a set number of people a day for an
// activity (diving: 30). Diving programs, dive courses and the diving page
// share the diving places. A booking holds places once it is confirmed, or
// while its online payment is open.
export const capacityPools = {
  diving: ["diving", ...experienceKeys, "course"],
  snorkeling: ["snorkeling"],
  trip: ["trip"],
};
export const defaultCapacity = { diving: 30, snorkeling: 0, trip: 0 };
export const poolOf = (program) =>
  Object.keys(capacityPools).find((pool) =>
    capacityPools[pool].includes(program),
  ) ?? null;
export function capacityOf(content, pool) {
  const value = content?.activities?.[pool]?.capacity;
  return Number.isInteger(value) && value >= 0
    ? value
    : (defaultCapacity[pool] ?? 0);
}
// A booking holds its places once confirmed, and while its payment is open:
// a Midtrans payment until Midtrans ends it, a PayPal payment or a bank
// transfer ordered on the website until its deadline.
export const holdsPlaces = (b, now = Date.now()) => {
  if (b.status === "confirmed") return true;
  if (b.status !== "pending" || !b.payment) return false;
  const p = b.payment;
  const due = !p.dueAt || Date.parse(p.dueAt) > now;
  if (["created", "pending"].includes(p.status))
    return p.provider !== "paypal" || due;
  return (
    p.status === "unpaid" &&
    p.method === "transfer" &&
    Boolean(p.orderId) &&
    due
  );
};
const nextDay = (date) =>
  new Date(Date.parse(date + "T00:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
// People already holding places in a pool, per day from..to.
export function placesUsed(bookings, pool, from, to) {
  const programs = capacityPools[pool] ?? [];
  const used = {};
  for (const b of bookings) {
    if (!programs.includes(b.experience) || !holdsPlaces(b)) continue;
    if (b.endDate < from || b.startDate > to) continue;
    let day = b.startDate < from ? from : b.startDate;
    const end = b.endDate > to ? to : b.endDate;
    for (let n = 0; day <= end && n < 400; n++, day = nextDay(day))
      used[day] = (used[day] ?? 0) + (Number(b.participants) || 0);
  }
  return used;
}
// What a public calendar shows for an activity: its daily places, the days
// already taken and the closed days. No names or contacts.
export function slotCalendar(content, bookings, activity, { today, last }) {
  return {
    capacity: capacityOf(content, activity),
    used: placesUsed(bookings, activity, today, last),
    closed: bookings
      .filter(
        (b) =>
          b.experience === activity &&
          b.status === "closed" &&
          b.endDate >= today,
      )
      .map((b) => [b.startDate, b.endDate]),
  };
}

// Booking dates follow the dive center's timezone, including for overseas guests.
export function bookingDates(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jayapura",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const last = new Date(today + "T12:00:00Z");
  last.setUTCDate(last.getUTCDate() + 365);
  return { today, last: last.toISOString().slice(0, 10) };
}

export function validateBookingRequest(input, now) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BookingError("Data booking tidak valid.");
  if (
    !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(
      input.requestId || "",
    )
  )
    throw new BookingError(
      "Permintaan tidak valid. Muat ulang halaman lalu coba lagi.",
    );
  if (input.website) throw new BookingError("Permintaan tidak dapat diproses.");
  if (
    typeof input.name !== "string" ||
    typeof input.phone !== "string" ||
    typeof (input.notes ?? "") !== "string" ||
    input.name.length > 80 ||
    (input.notes || "").length > 1000
  )
    throw new BookingError("Periksa nama dan catatan booking.");
  const phone = input.phone.trim();
  if (
    !/^\+?[\d\s()-]{8,30}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 8
  )
    throw new BookingError(
      "Isi nomor WhatsApp yang dapat dihubungi, termasuk kode negara.",
    );
  if (
    !/^\d{1,2}$/.test(String(input.people)) ||
    Number(input.people) < 1 ||
    Number(input.people) > 30
  )
    throw new BookingError("Jumlah peserta harus 1–30 orang.");
  let booking;
  try {
    booking = validateBooking({
      experience: input.experience,
      status: "pending",
      source: "website",
      startDate: input.date,
      endDate: input.date,
      guestName: input.name.trim(),
      phone,
      participants: Number(input.people),
      amount: 0,
      notes: input.notes || "",
    });
  } catch (error) {
    throw new BookingError(error.message);
  }
  const dates = bookingDates(now);
  if (booking.startDate < dates.today || booking.startDate > dates.last)
    throw new BookingError(
      "Pilih tanggal mulai hari ini hingga satu tahun ke depan (WIT).",
    );
  return { requestId: input.requestId.toLowerCase(), booking };
}

export function assertBookable(content, bookings, booking) {
  const program = ["course", "shop", "service"].includes(booking.experience)
    ? { enabled: true }
    : (content.experiences?.[booking.experience] ??
      content.activities?.[booking.experience]);
  if (!program?.enabled)
    throw new BookingError(
      "Program ini belum menerima booking. Pilih program lain.",
      409,
    );
  if (
    bookings.some(
      (b) =>
        b.experience === booking.experience &&
        b.status === "closed" &&
        b.startDate <= booking.startDate &&
        b.endDate >= booking.startDate,
    )
  )
    throw new BookingError(
      "Tanggal ini sudah ditutup untuk program yang dipilih. Silakan pilih tanggal lain.",
      409,
    );
  const pool = poolOf(booking.experience);
  const capacity = pool ? capacityOf(content, pool) : 0;
  if (capacity > 0) {
    const used = placesUsed(bookings, pool, booking.startDate, booking.endDate);
    const left = Math.max(0, capacity - Math.max(0, ...Object.values(used)));
    if ((Number(booking.participants) || 0) > left)
      throw new BookingError(
        left > 0
          ? `Slot tanggal ini tinggal ${left} orang. Kurangi peserta atau pilih tanggal lain.`
          : "Slot tanggal ini sudah penuh. Silakan pilih tanggal lain.",
        409,
      );
  }
}

export function bookingReference(id) {
  return "ZC-" + id.replace(/-/g, "").slice(0, 12).toUpperCase();
}

export function bookingReceipt(booking, demo) {
  return {
    reference: bookingReference(booking.id),
    status: "pending",
    date: booking.startDate,
    experience: booking.experience,
    demo,
  };
}

export function calendarAvailability(
  content,
  bookings,
  experience,
  month,
  now,
) {
  if (
    !experienceKeys.includes(experience) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")
  )
    throw new BookingError("Program atau bulan kalender tidak valid.");
  const dates = bookingDates(now);
  if (month < dates.today.slice(0, 7) || month > dates.last.slice(0, 7))
    throw new BookingError("Bulan berada di luar rentang booking.");
  return {
    ...dates,
    enabled: Boolean(content.experiences?.[experience]?.enabled),
    closed: bookings
      .filter(
        (b) =>
          b.experience === experience &&
          b.status === "closed" &&
          b.startDate.slice(0, 7) <= month &&
          b.endDate.slice(0, 7) >= month,
      )
      .map(({ startDate, endDate }) => ({ startDate, endDate })),
  };
}
