import StatusView from "../../../src/components/StatusView.jsx";
import { publicContent } from "../../../src/server/store.js";
import { syncPayment } from "../../../src/server/payments.js";
import { requestLocale } from "../../../src/server/locale.js";
import { bookingReference } from "../../../src/booking-model.js";
import { paymentItemLabel } from "../../../src/payment-model.js";
import { dictionary, formatIDR, localeHref } from "../../../src/i18n.js";
import { fareNames } from "../../../src/fare-model.js";

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
      // A paid booking links to the guest's own page, where the fare's
      // date change or refund is made.
      links={
        kind === "paid" && payment.manageToken
          ? [
              [
                `/booking/${booking.id}?t=${payment.manageToken}&lang=${locale}`,
                t.manage.manageLink,
              ],
            ]
          : []
      }
      backHref={localeHref(
        locale,
        booking.experience === "shop"
          ? "/dive-shop"
          : `/${booking.experience}#prices`,
      )}
      details={[
        [p.reference, reference],
        [
          p.activity,
          t.activityLabels[booking.experience] ??
            p.programs[booking.experience] ??
            booking.experience,
        ],
        [p.package, paymentItemLabel(payment, locale)],
        [p.date, date],
        ...(["shop", "service"].includes(booking.experience)
          ? []
          : [[p.participants, String(booking.participants)]]),
        ...(payment.fare
          ? [
              [
                t.fare.label,
                t.fare.line(fareNames[payment.fare.tier], payment.fare.percent),
              ],
            ]
          : []),
        [p.totalPaid, formatIDR(payment.amount, locale)],
      ]}
    />
  );
}
