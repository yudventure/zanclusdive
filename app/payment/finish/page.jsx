import StatusView from "../../../src/components/StatusView.jsx";
import { publicContent } from "../../../src/server/store.js";
import { syncPayment } from "../../../src/server/payments.js";
import { requestLocale } from "../../../src/server/locale.js";
import { bookingReference } from "../../../src/booking-model.js";
import { dictionary, formatIDR, localeHref } from "../../../src/i18n.js";

// Midtrans sends the guest back here with ?order_id=. The status is
// checked with Midtrans right away, so a completed payment already shows
// as booked even if the notification is still on its way.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Status pembayaran · Zanclus Dive Center",
  robots: { index: false },
};
export default async function Page({ searchParams }) {
  const query = await searchParams;
  const locale =
    query.lang === "id" || query.lang === "en"
      ? query.lang
      : await requestLocale();
  const orderId = typeof query.order_id === "string" ? query.order_id : "";
  const [booking, content] = await Promise.all([
    orderId ? syncPayment(orderId) : null,
    publicContent(),
  ]);
  const whatsapp = content.contact?.whatsapp;
  if (!booking?.payment)
    return <StatusView kind="404" locale={locale} whatsapp={whatsapp} />;
  const t = dictionary(locale);
  const payment = booking.payment;
  const reference = bookingReference(booking.id);
  const kind =
    payment.status === "paid"
      ? "paid"
      : ["created", "pending"].includes(payment.status)
        ? "paymentPending"
        : "paymentFailed";
  const date = new Date(booking.startDate + "T12:00:00").toLocaleDateString(
    locale === "id" ? "id-ID" : "en-GB",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
  const p = t.payment;
  return (
    <StatusView
      kind={kind}
      locale={locale}
      whatsapp={whatsapp}
      whatsappText={p.whatsappAfter(reference)}
      backHref={localeHref(locale, `/${booking.experience}#inquiry`)}
      details={[
        [p.reference, reference],
        [
          p.activity,
          t.activityLabels[booking.experience] ?? booking.experience,
        ],
        [
          p.package,
          `${(locale === "en" && payment.itemEn) || payment.item} × ${payment.quantity}`,
        ],
        [p.date, date],
        [p.participants, String(booking.participants)],
        [p.totalPaid, formatIDR(payment.amount, locale)],
      ]}
    />
  );
}
