import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

// Six-digit codes sent by email to change an admin password. Kept in the
// server's memory only, as a keyed hash: valid 10 minutes, 5 tries, used
// once. A new code can be asked for after a minute, at most 5 an hour.
export const otpMinutes = 10;
const tries = 5;
const resendAfter = 60000;
const perHour = 5;
export class OtpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const store = () => (globalThis.__zanclusOtps ||= new Map());
const key = () => (globalThis.__zanclusOtpKey ||= randomBytes(32));
const digest = (email, code) =>
  createHmac("sha256", key())
    .update(email + "|" + code)
    .digest();
const emailKey = (email) => String(email).trim().toLowerCase();

export function issueOtp(email, now = Date.now()) {
  const id = emailKey(email);
  const entry = store().get(id);
  const sent = (entry?.sent ?? []).filter((t) => now - t < 3600000);
  if (sent.length && now - sent[sent.length - 1] < resendAfter)
    throw new OtpError(
      "Kode baru bisa diminta 1 menit setelah kode sebelumnya.",
      429,
    );
  if (sent.length >= perHour)
    throw new OtpError(
      "Sudah 5 kode dikirim dalam 1 jam terakhir. Coba lagi nanti.",
      429,
    );
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  store().set(id, {
    hash: digest(id, code),
    expires: now + otpMinutes * 60000,
    attempts: 0,
    sent: [...sent, now],
  });
  return code;
}

// Cancels a code that could not be sent, so the next request is not held
// back by the one-minute wait.
export function dropOtp(email) {
  const entry = store().get(emailKey(email));
  if (entry) store().set(emailKey(email), { sent: entry.sent.slice(0, -1) });
}

export function checkOtp(email, code, now = Date.now()) {
  const id = emailKey(email);
  const entry = store().get(id);
  if (!entry?.hash || now > entry.expires)
    throw new OtpError("Kode OTP sudah tidak berlaku. Minta kode baru.");
  entry.attempts++;
  const given = String(code ?? "").replace(/\s/g, "");
  const ok =
    /^\d{6}$/.test(given) && timingSafeEqual(digest(id, given), entry.hash);
  if (ok) {
    store().set(id, { sent: entry.sent });
    return true;
  }
  if (entry.attempts >= tries) {
    store().set(id, { sent: entry.sent });
    throw new OtpError(
      "Kode OTP salah 5 kali dan sudah dibatalkan. Minta kode baru.",
    );
  }
  throw new OtpError(
    `Kode OTP salah. Sisa ${tries - entry.attempts} kali percobaan.`,
  );
}
