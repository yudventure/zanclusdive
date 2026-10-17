import StatusView from "../../../src/components/StatusView.jsx";
import ManageBooking from "../../../src/booking/ManageBooking.jsx";
import {
  listAgents,
  listBookings,
  publicContent,
} from "../../../src/server/store.js";
import {
  bookingView,
  findOwnBooking,
} from "../../../src/server/own-booking.js";
import { requestLocale } from "../../../src/server/locale.js";
import {
  bookingDates,
  poolOf,
  slotCalendar,
} from "../../../src/booking-model.js";
import { agentHolds } from "../../../src/agent-calendar.js";
import { dictionary } from "../../../src/i18n.js";

// The guest's own page for a paid booking, opened from the invoice email
// or the payment result: /booking/<id>?t=<key>. Without the right key it
// is a plain "not found".
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kelola pesanan · Zanclus Dive Center",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [booking, content] = await Promise.all([
    findOwnBooking(id, query.t).catch(() => null),
    publicContent(),
  ]);
  const whatsapp = content.contact?.whatsapp;
  const asked = query.lang === "id" || query.lang === "en" ? query.lang : null;
  if (!booking)
    return (
      <StatusView
        kind="404"
        locale={asked ?? (await requestLocale())}
        whatsapp={whatsapp}
      />
    );
  const locale = asked ?? (booking.lang === "en" ? "en" : "id");
  const window = bookingDates();
  // The places left on each day for a new date, without this booking.
  const pool = poolOf(booking.experience);
  let slots = { capacity: 0, used: {}, closed: [] };
  if (pool) {
    const [bookings, agents] = await Promise.all([
      listBookings().catch(() => []),
      listAgents().catch(() => []),
    ]);
    slots = slotCalendar(
      content,
      [
        ...bookings.filter((b) => b.id !== booking.id),
        ...agentHolds(content, agents),
      ],
      pool,
      window,
    );
  }
  const t = dictionary(locale);
  return (
    <ManageBooking
      initial={bookingView(booking, window.today)}
      token={query.t}
      locale={locale}
      whatsapp={whatsapp}
      slots={slots}
      lastDate={window.last}
      programLabel={
        t.activityLabels[booking.experience] ??
        t.payment.programs[booking.experience] ??
        booking.experience
      }
    />
  );
}
