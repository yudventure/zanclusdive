import { dictionary } from "../i18n.js";
import { rupiah, deliveryLines } from "../shop-model.js";
import { cleanWhatsApp, cleanEmail } from "../contact-fields.js";

// Homepage Dive Shop cart. A line is
// { key, name, price (rupiah or null), mode: "sale" | "rental", quantity },
// and "size" for Dive Shop gear that comes in sizes.

export function addLine(cart, item, delta = 1) {
  const current = cart.find((line) => line.key === item.key);
  const quantity = Math.min(10, (current?.quantity ?? 0) + delta);
  if (quantity <= 0) return cart.filter((line) => line.key !== item.key);
  if (current)
    return cart.map((line) =>
      line.key === item.key ? { ...line, quantity } : line,
    );
  return [...cart, { ...item, quantity }];
}

export function cartTotals(cart, days = 1) {
  const sum = (mode) =>
    cart
      .filter((line) => line.mode === mode && line.price !== null)
      .reduce((total, line) => total + line.price * line.quantity, 0);
  const sale = sum("sale");
  const rental = sum("rental") * days;
  return {
    count: cart.reduce((total, line) => total + line.quantity, 0),
    sale,
    rental,
    total: sale + rental,
    hasRental: cart.some((line) => line.mode === "rental"),
    needsQuote: cart.some((line) => line.price === null),
  };
}

// Validates the checkout form and returns the WhatsApp message.
export function checkoutMessage(cart, details, today, locale = "id") {
  const t = dictionary(locale).shop.teaser;
  const m = t.message;
  const name = details.name?.trim() ?? "";
  if (!name || name.length > 80) throw new Error(t.errName);
  const whatsapp = cleanWhatsApp(details.whatsapp);
  if (!whatsapp) throw new Error(t.errWhatsapp);
  const email = cleanEmail(details.email);
  if (email === null) throw new Error(t.errEmail);
  const totals = cartTotals(cart, details.days);
  if (totals.hasRental) {
    if (
      !Number.isInteger(details.days) ||
      details.days < 1 ||
      details.days > 30
    )
      throw new Error(t.errDays);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(details.startDate ?? "") ||
      details.startDate < today
    )
      throw new Error(t.errDate);
  }
  const price = (line) =>
    line.price === null
      ? t.askPrice
      : rupiah(line.price, locale) +
        (line.mode === "rental" ? " " + m.perDay : "");
  const notes = details.notes?.trim().slice(0, 500);
  return [
    m.greeting(name),
    `WhatsApp ${whatsapp}`,
    ...(email ? [`Email ${email}`] : []),
    "",
    ...cart.map(
      (line) =>
        `${line.mode === "sale" ? m.buy : m.rent} · ${line.name}${line.size ? " " + m.size(line.size) : ""} × ${line.quantity} · ${price(line)}`,
    ),
    "",
    ...(totals.hasRental ? [m.period(details.days, details.startDate)] : []),
    // The fare picked for the rentals, with its increase in the total.
    ...(details.fare?.text ? [details.fare.text] : []),
    ...deliveryLines(details.delivery, locale),
    `${m.total} ${rupiah(totals.total + (details.fare?.markup ?? 0) + (details.delivery?.fee ?? 0), locale)}`,
    ...(totals.needsQuote ? [m.quote] : []),
    ...(notes ? [`${m.notes} ${notes}`] : []),
    "",
    m.closing,
  ].join("\n");
}
