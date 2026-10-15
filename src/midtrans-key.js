// Reading the Midtrans settings typed into the hosting panel. Spaces and
// quotes around a value are ignored. Anything else pasted with the server
// key, or a key that does not fit the mode, is explained in the admin in
// plain words, because Midtrans only answers 401.

const unquote = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();

export const cleanKey = unquote;

// MIDTRANS_PRODUCTION=true switches to real payments; True or "true" count.
export const productionOn = (value) => unquote(value).toLowerCase() === "true";

// A server key as Midtrans issues it: Mid-server- for real payments,
// SB-Mid-server- for the sandbox, VT-server- on old accounts.
const serverKey = /(?:SB-)?(?:Mid|VT)-server-[A-Za-z0-9_-]+/i;
const shown = (text) => (text.length > 40 ? text.slice(0, 40) + "…" : text);

export function keyIssues(rawKey, rawProduction) {
  const value = cleanKey(rawKey);
  const issues = [];
  const flag = unquote(rawProduction);
  const production = productionOn(rawProduction);
  if (flag && !production && flag.toLowerCase() !== "false")
    issues.push(
      `MIDTRANS_PRODUCTION berisi "${shown(flag)}". Ubah isinya menjadi true saja untuk pembayaran sungguhan, lalu deploy ulang.`,
    );
  if (!value) return issues;
  if (/^(SB-)?Mid-client-/i.test(value)) {
    issues.push(
      "Yang diisi di MIDTRANS_SERVER_KEY adalah Client Key. Isi dengan Server Key dari dashboard Midtrans (Settings → Access Keys).",
    );
    return issues;
  }
  const match = value.match(serverKey);
  if (!match) {
    issues.push(
      "Isi MIDTRANS_SERVER_KEY bukan Server Key Midtrans. Server Key berawalan Mid-server- untuk pembayaran sungguhan atau SB-Mid-server- untuk uji coba. Salin dari dashboard Midtrans (Settings → Access Keys).",
    );
    return issues;
  }
  const extra = (
    value.slice(0, match.index) +
    " " +
    value.slice(match.index + match[0].length)
  ).trim();
  if (extra)
    issues.push(
      `Isi MIDTRANS_SERVER_KEY di hosting punya teks tambahan "${shown(extra)}" yang bukan bagian dari key, jadi Midtrans menolaknya. Ubah isinya menjadi Server Key saja, tanpa teks lain, lalu deploy ulang.` +
        (/true|production/i.test(extra)
          ? " MIDTRANS_PRODUCTION dibuat sebagai variabel sendiri dengan isi true."
          : ""),
    );
  const key = match[0];
  if (!production && /^Mid-server-/i.test(key))
    issues.push(
      "Server key ini untuk pembayaran sungguhan (production), tetapi MIDTRANS_PRODUCTION belum true. Di hPanel tambahkan variabel baru bernama MIDTRANS_PRODUCTION dengan isi true, lalu deploy ulang. Untuk uji coba, pakai server key sandbox (awalan SB-Mid-server-).",
    );
  else if (production && /^SB-/i.test(key))
    issues.push(
      "Server key sandbox (awalan SB-) dipakai dengan MIDTRANS_PRODUCTION=true. Hapus MIDTRANS_PRODUCTION untuk uji coba, atau pakai server key production.",
    );
  return issues;
}

// The end of the key the server reads, so the owner can see that a change
// in hPanel arrived after the redeploy.
export const keyEnding = (rawKey) => {
  const value = cleanKey(rawKey);
  return value.length > 12 ? value.slice(-4) : "";
};
