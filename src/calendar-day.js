import { bookingPrograms } from "./cms-model.js";
import { gearLines } from "./shop-stock.js";

// Everyone out on one day of the reservation calendar, for the panel beside
// it: the reservations of each program with the day of the trip, the
// rental gear and who rents it, the agents' events, and the programs closed
// that day. Cancelled reservations are left out. "gear" is the rental gear
// of the warehouse ({ productId, size, name, pair }), for the gear's names.
export function dayAgenda(date, bookings, { agents = [], gear = [] } = {}) {
  const on = bookings.filter(
    (b) => b.status !== "cancelled" && b.startDate <= date && b.endDate >= date,
  );
  const open = on.filter((b) => b.status !== "closed");
  const dayOf = (b) => ({
    day: daysBetween(b.startDate, date) + 1,
    days: daysBetween(b.startDate, b.endDate) + 1,
  });
  const programs = bookingPrograms
    .map((key) => {
      const entries = open
        .filter((b) => b.experience === key)
        .map((booking) => ({ booking, ...dayOf(booking) }));
      return {
        key,
        entries,
        people: entries.reduce((sum, e) => sum + people(e.booking), 0),
      };
    })
    .filter((group) => group.entries.length);
  // Gear booked when it was the rental side of a product for sale names
  // that product.
  const renamed = new Map(
    gear.filter((g) => g.pair).map((g) => [g.pair, g.productId]),
  );
  const names = new Map(
    gear.map((g) => [`${g.productId}::${g.size ?? ""}`, g.name]),
  );
  const rentals = open
    .map((booking) => {
      const items = new Map();
      for (const line of gearLines(booking)) {
        if (!line.product || line.mode !== "rental") continue;
        const id = renamed.get(line.product) ?? line.product;
        const key = `${id}::${line.size ?? ""}`;
        const name =
          names.get(key) ??
          (typeof line.name === "object" ? line.name?.id : line.name) ??
          id;
        const item = items.get(key) ?? { name, quantity: 0 };
        item.quantity += Number(line.quantity) || 0;
        items.set(key, item);
      }
      return { booking, items: [...items.values()] };
    })
    .filter((rental) => rental.items.length);
  const events = agents
    .filter((agent) => agent.enabled)
    .flatMap((agent) =>
      (agent.events ?? [])
        .filter((event) => event.start <= date && event.end >= date)
        .map((event) => ({ agent, event })),
    );
  return {
    programs,
    rentals,
    agents: events,
    closed: on.filter((b) => b.status === "closed"),
    people: open.reduce((sum, b) => sum + people(b), 0),
    count: open.length,
  };
}

const people = (b) => Number(b.participants) || 0;
const daysBetween = (from, to) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
const addDays = (date, n) =>
  new Date(Date.parse(date + "T00:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);

// The guests around today, for the panel beside the calendar: who arrived
// in the last "days" days (yesterday first), who is out today, and who
// arrives in the next "days" days, by the day they arrive. A trip of
// several days counts on its first day. Cancelled reservations and closed
// dates are left out, "program" narrows it to one activity, and the
// agents' and OTAs' events come along for all activities.
export function guestFlow(
  today,
  bookings,
  { agents = [], program = "all", days = 7 } = {},
) {
  const open = bookings.filter(
    (b) =>
      !["cancelled", "closed"].includes(b.status) &&
      (program === "all" || b.experience === program),
  );
  const events =
    program === "all"
      ? agents
          .filter((agent) => agent.enabled)
          .flatMap((agent) =>
            (agent.events ?? []).map((event) => ({ agent, event })),
          )
      : [];
  const rank = (b) => bookingPrograms.indexOf(b.experience);
  const sorted = (list) =>
    list.sort((x, y) =>
      x.booking && y.booking
        ? rank(x.booking) - rank(y.booking) ||
          String(x.booking.guestName).localeCompare(String(y.booking.guestName))
        : x.booking
          ? -1
          : y.booking
            ? 1
            : 0,
    );
  const dayGroup = (date, entries) => ({
    date,
    entries: sorted(entries),
    people: entries.reduce(
      (sum, e) => sum + (e.booking ? people(e.booking) : 0),
      0,
    ),
  });
  const trip = (booking, date) => ({
    booking,
    day: daysBetween(booking.startDate, date) + 1,
    days: daysBetween(booking.startDate, booking.endDate) + 1,
  });
  const arriving = (date) =>
    dayGroup(date, [
      ...open.filter((b) => b.startDate === date).map((b) => trip(b, date)),
      ...events.filter(({ event }) => event.start === date),
    ]);
  const range = (from, count, step) =>
    Array.from({ length: count }, (_, i) => addDays(from, (i + 1) * step));
  const now = dayGroup(today, [
    ...open
      .filter((b) => b.startDate <= today && b.endDate >= today)
      .map((b) => trip(b, today)),
    ...events.filter(({ event }) => event.start <= today && event.end >= today),
  ]);
  // Who arrives today comes before who is already out.
  now.entries.sort((x, y) => (x.day ?? 1) - (y.day ?? 1));
  const filled = (groups) => groups.filter((g) => g.entries.length);
  const total = (groups) => ({
    count: groups.reduce((sum, g) => sum + g.entries.length, 0),
    people: groups.reduce((sum, g) => sum + g.people, 0),
  });
  const past = filled(range(today, days, -1).map(arriving));
  const next = filled(range(today, days, 1).map(arriving));
  return {
    past: { groups: past, ...total(past) },
    today: { groups: filled([now]), ...total([now]) },
    next: { groups: next, ...total(next) },
  };
}

// "62812…" for a wa.me link from a phone as typed: 0812…, +62 812…, 812….
export function whatsappNumber(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}
