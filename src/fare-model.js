// Fares for scheduled bookings: activity packages (diving, snorkeling, sea
// trips and boats) and Dive Shop rentals. The guest picks one at checkout.
//   Standard  the base price. The date only moves when weather or sea
//             conditions rule the day out, decided by the team.
//   Comfort   base price plus a percentage. The guest moves the date
//             themselves, up to rescheduleDays before it.
//   Flexi     base price plus a larger percentage. The guest moves the date
//             the same way, or cancels for a refund up to refundDays before.
// The refund is the price paid less the Flexi increase: the increase is
// what covers the cancellation (the owner's rule at DAMPIER too). Add-ons
// come back in full; purchases in a Dive Shop order are not part of it.
// The fare and its rules are frozen on the booking when it is ordered.

export const fareTiers = ["standard", "comfort", "flexi"];
export const fareNames = {
  standard: "Standard",
  comfort: "Comfort",
  flexi: "Flexi",
};
export const defaultFares = {
  enabled: true,
  comfort: { enabled: true, percent: 10 },
  flexi: { enabled: true, percent: 20 },
  refundDays: 7,
  rescheduleDays: 2,
};
// What each fare allows.
export const farePolicy = {
  standard: { reschedule: false, refund: false },
  comfort: { reschedule: true, refund: false },
  flexi: { reschedule: true, refund: true },
};

const whole = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

// The saved settings, or the defaults for content saved before fares.
export function fareSettings(input) {
  const base = structuredClone(defaultFares);
  if (!input || typeof input !== "object") return base;
  const tier = (key) => ({
    enabled: input[key]?.enabled !== false,
    percent: whole(input[key]?.percent, base[key].percent, 1, 100),
  });
  return {
    enabled: input.enabled !== false,
    comfort: tier("comfort"),
    flexi: tier("flexi"),
    refundDays: whole(input.refundDays, base.refundDays, 1, 60),
    rescheduleDays: whole(input.rescheduleDays, base.rescheduleDays, 0, 30),
  };
}

// Checked when the admin saves: wrong numbers are refused, not replaced.
export function validateFares(input) {
  if (input === undefined || input === null)
    return structuredClone(defaultFares);
  if (typeof input !== "object" || Array.isArray(input))
    throw new Error("Pengaturan tarif tidak valid.");
  const percent = (key, label) => {
    const n = Number(input[key]?.percent);
    if (!Number.isInteger(n) || n < 1 || n > 100)
      throw new Error(`Kenaikan tarif ${label} harus 1–100 persen.`);
    return n;
  };
  const days = (key, label, min, max) => {
    const n = Number(input[key]);
    if (!Number.isInteger(n) || n < min || n > max)
      throw new Error(`${label} harus ${min}–${max} hari.`);
    return n;
  };
  const comfort = percent("comfort", "Comfort");
  const flexi = percent("flexi", "Flexi");
  return {
    enabled: input.enabled !== false,
    comfort: { enabled: input.comfort?.enabled !== false, percent: comfort },
    flexi: { enabled: input.flexi?.enabled !== false, percent: flexi },
    refundDays: days("refundDays", "Batas refund", 1, 60),
    rescheduleDays: days("rescheduleDays", "Batas ganti tanggal", 0, 30),
  };
}

// The fares a guest can pick, Standard first. Nothing to pick when fares
// are switched off: every order is then Standard.
export function fareChoices(input) {
  const fares = fareSettings(input);
  if (!fares.enabled) return [{ tier: "standard", percent: 0 }];
  return fareTiers
    .filter((tier) => tier === "standard" || fares[tier].enabled)
    .map((tier) => ({
      tier,
      percent: tier === "standard" ? 0 : fares[tier].percent,
    }));
}

// The choice for a tier, Standard when that tier is not offered.
export const fareFor = (input, tier) =>
  fareChoices(input).find((c) => c.tier === tier) ?? {
    tier: "standard",
    percent: 0,
  };

export const fareMarkup = (base, percent) =>
  Math.round((Math.max(0, base) * Math.max(0, percent)) / 100);

// The fare of an order: amount is its price before the increase, base the
// part the increase applies to (main packages, rentals) and purchases the
// part a refund never covers. null when the tier asked for is not offered.
export function orderFare(input, tier, { amount, base, purchases = 0 }) {
  const fares = fareSettings(input);
  const choice = fareChoices(fares).find(
    (c) => c.tier === (tier || "standard"),
  );
  if (!choice) return null;
  const markup = fareMarkup(base, choice.percent);
  return {
    tier: choice.tier,
    percent: choice.percent,
    markup,
    refundDays: fares.refundDays,
    rescheduleDays: fares.rescheduleDays,
    // What a Flexi cancellation gives back: the price paid less the
    // increase and any purchases.
    refundable: Math.max(0, amount - purchases),
  };
}

const day = 86400000;
export const shiftDate = (date, n) =>
  new Date(Date.parse(date + "T00:00:00Z") + n * day)
    .toISOString()
    .slice(0, 10);
const daysBetween = (from, to) =>
  Math.round(
    (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / day,
  );

// What the guest may still do with a paid booking today (a WIT date):
// the last day to move the date or to cancel with a refund, and whether
// that is still possible.
export function fareActions(booking, today) {
  const fare = booking?.payment?.fare;
  const policy = farePolicy[fare?.tier];
  const open =
    Boolean(policy) &&
    booking.payment?.status === "paid" &&
    booking.status === "confirmed" &&
    today < booking.startDate;
  const rescheduleUntil = policy?.reschedule
    ? shiftDate(booking.startDate, -fare.rescheduleDays)
    : "";
  const refundUntil = policy?.refund
    ? shiftDate(booking.startDate, -fare.refundDays)
    : "";
  return {
    tier: fare?.tier ?? "",
    rescheduleUntil,
    refundUntil,
    canReschedule: open && Boolean(rescheduleUntil) && today <= rescheduleUntil,
    canRefund: open && Boolean(refundUntil) && today <= refundUntil,
    refundAmount: policy?.refund ? fare.refundable : 0,
    daysLeft: booking?.startDate ? daysBetween(today, booking.startDate) : 0,
  };
}
