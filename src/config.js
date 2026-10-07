// Public contact number; build again after changing NEXT_PUBLIC_WHATSAPP_NUMBER.
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285190849237";
const nationalNumber = WHATSAPP_NUMBER.startsWith("62")
  ? "0" + WHATSAPP_NUMBER.slice(2)
  : "+" + WHATSAPP_NUMBER;
export const WHATSAPP_DISPLAY = nationalNumber.replace(
  /^(\d{4})(\d{4})(\d+)$/,
  "$1 $2 $3",
);
