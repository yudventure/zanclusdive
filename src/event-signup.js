// Signing up for an event from its homepage banner. The banner is looked up
// on the server among those showing today, so its price, minimum group and
// dates come from the CMS. The sign-up is saved as a reservation request
// (sea trip program, website source, waiting for the team), like the
// booking form.
import {
  BookingError,
  bookingDates,
  validateBookingRequest,
} from "./booking-model.js";
import { validateBooking } from "./cms-model.js";
import { activeBanners, eventDates, withCalendar } from "./calendar-model.js";
import { cleanEmail } from "./contact-fields.js";
import { formatIDR } from "./i18n.js";

export const eventProgram = "trip";

// The banner a visitor signs up for, by its Indonesian title.
export function signupBanner(content, title, today) {
  return activeBanners(withCalendar(content).calendar, today).find(
    (b) => b.title.id === title && !b.link,
  );
}

export function validateEventSignup(content, input, now, locale = "id") {
  const { today } = bookingDates(now);
  const banner = signupBanner(content, input?.event, today);
  if (!banner)
    throw new BookingError(
      "Event ini sudah tidak menerima pendaftaran. Muat ulang halaman.",
      409,
    );
  const people = Number(input.people);
  if (Number.isInteger(people) && people < banner.minPeople)
    throw new BookingError(
      `Event ini untuk minimal ${banner.minPeople} peserta.`,
    );
  // Dated events use their own dates; otherwise the guest picks a start.
  const date = banner.startDate || input.date;
  const { requestId, booking } = validateBookingRequest(
    {
      requestId: input.requestId,
      website: input.website,
      name: input.name,
      phone: input.phone,
      notes: input.notes ?? "",
      people: input.people,
      experience: eventProgram,
      date,
    },
    now,
  );
  const email = cleanEmail(input.email);
  if (email === null) throw new BookingError("Format email belum benar.");
  const dates = eventDates(banner.startDate, banner.endDate, "id");
  const line = [
    `Daftar event ${banner.title.id}`,
    dates || "tanggal pilihan tamu",
    banner.amount ? `${formatIDR(banner.amount, "id")} / orang` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  try {
    return {
      requestId,
      banner,
      booking: validateBooking({
        ...booking,
        endDate: banner.endDate || booking.startDate,
        email,
        amount: banner.amount * booking.participants,
        lang: locale === "en" ? "en" : "id",
        notes: [line, booking.notes].filter(Boolean).join("\n"),
      }),
    };
  } catch (error) {
    throw new BookingError(error.message);
  }
}
