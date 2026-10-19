// Which reservations ring the admin's bell: a booking that came in from
// the website since the last look, and a payment that turned paid. seen
// maps each booking id to whether it was paid then; the answer gives the
// alerts and the map for the next look.
export function bookingAlerts(seen, bookings) {
  const alerts = [];
  const next = new Map();
  for (const booking of bookings ?? []) {
    const paid = booking.payment?.status === "paid";
    next.set(booking.id, paid);
    if (!seen.has(booking.id)) {
      if (booking.source === "website")
        alerts.push({ kind: paid ? "paid" : "new", booking });
    } else if (paid && seen.get(booking.id) === false)
      alerts.push({ kind: "paid", booking });
  }
  return { alerts, seen: next };
}
