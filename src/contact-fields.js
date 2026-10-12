// Contact details asked for in the public forms: a WhatsApp number (required)
// and an email address (optional), kept as separate fields.
export function cleanWhatsApp(value) {
  const phone = typeof value === "string" ? value.trim() : "";
  const digits = phone.replace(/\D/g, "");
  return /^\+?[\d\s().-]{8,30}$/.test(phone) &&
    digits.length >= 8 &&
    digits.length <= 15
    ? phone
    : null;
}
export function cleanEmail(value) {
  const email = typeof value === "string" ? value.trim() : "";
  if (!email) return "";
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}
