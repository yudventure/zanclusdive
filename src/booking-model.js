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
};
export function bookingErrorMessage(message, locale) {
  if (locale !== "en") return message;
  return englishErrors[message] ?? "Please check your booking details.";
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
  if (!content.experiences?.[booking.experience]?.enabled)
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
