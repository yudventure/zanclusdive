// What the admin can do with a booking opened from the corner note or the
// bell: confirm a request, confirm a bank transfer that arrived, or only
// read it while an online payment runs or once it is settled.
export function noticeKind(booking) {
  if (["cancelled", "closed"].includes(booking?.status)) return "closed";
  if (booking?.status === "confirmed") return "confirmed";
  const payment = booking?.payment;
  if (payment?.status === "paid") return "confirmed";
  if (
    payment?.provider === "manual" &&
    payment.method === "transfer" &&
    payment.status === "unpaid"
  )
    return "transfer";
  if (payment && ["created", "pending"].includes(payment.status))
    return "online";
  return "request";
}

// The line under the booking and the main button, for each kind. No
// colons, as in all the owner's texts.
export const noticeTexts = {
  request: {
    eyebrow: "Booking baru, perlu konfirmasi",
    text: "Pastikan jadwal dan harga dengan tamu lewat WhatsApp, lalu konfirmasi. Tanggalnya tercatat Dikonfirmasi di kalender.",
    confirm: "Konfirmasi booking",
  },
  transfer: {
    eyebrow: "Menunggu transfer bank",
    text: "Tamu memilih transfer bank. Konfirmasi setelah uangnya masuk ke rekening. Booking tercatat lunas dan tamu menerima invoice.",
    confirm: "Transfer sudah masuk, konfirmasi",
  },
  online: {
    eyebrow: "Sedang membayar online",
    text: "Tamu sedang membayar lewat Midtrans atau PayPal. Booking terkonfirmasi sendiri begitu lunas, tidak perlu apa-apa.",
    confirm: "",
  },
  confirmed: {
    eyebrow: "Sudah dikonfirmasi",
    text: "Booking ini sudah dikonfirmasi dan tercatat di kalender.",
    confirm: "",
  },
  closed: {
    eyebrow: "Dibatalkan",
    text: "Booking ini sudah dibatalkan atau tanggalnya ditutup.",
    confirm: "",
  },
};

// The tag beside a booking in the bell's list, when it is more than a
// plain request.
export const noticeTags = {
  transfer: "Transfer bank",
  online: "Bayar online",
  confirmed: "Lunas",
};
