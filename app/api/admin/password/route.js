import { cookies } from "next/headers";
import {
  requireAdmin,
  currentAdmin,
  authConfigured,
  sameOrigin,
  jsonBody,
  findAccount,
  passwordProblem,
  changePassword,
  sessionToken,
  COOKIE,
  cookieOptions,
  apiFailure,
} from "../../../../src/server/auth.js";
import {
  issueOtp,
  checkOtp,
  dropOtp,
  OtpError,
  otpMinutes,
} from "../../../../src/server/otp.js";
import {
  mailIssues,
  mailConfigured,
  otpRecipient,
  maskEmail,
  sendMail,
  mailFailure,
} from "../../../../src/server/mailer.js";
import { clearLoginFailures } from "../../../../src/server/store.js";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (body, status = 200) => Response.json(body, { status, headers });
const notConfigured =
  "Pengiriman email belum diatur di hosting. Isi SMTP_HOST, SMTP_USER dan SMTP_PASS di hPanel (lihat panduan CMS Hostinger).";
const forgotSent =
  "Jika email itu terdaftar, kode OTP sudah dikirim ke email pemulihan akun. Periksa juga folder spam.";

// Where the code goes, for the password page in the admin.
export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const admin = await currentAdmin();
    const account = await findAccount(admin.email);
    return reply({
      email: admin.email,
      recipient: maskEmail(otpRecipient(account)),
      mail: mailIssues(),
      minutes: otpMinutes,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

// The login page's "Lupa password" is limited per address as well.
function allowForgot(request, now = Date.now()) {
  const address = (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "local"
  ).slice(0, 100);
  const limits = (globalThis.__zanclusForgot ||= new Map());
  for (const [key, entry] of limits)
    if (now - entry.start >= 900000) limits.delete(key);
  const entry = limits.get(address) || { start: now, attempts: 0 };
  if (entry.attempts >= 10 || limits.size >= 5000)
    throw new OtpError(
      "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
      429,
    );
  entry.attempts++;
  limits.set(address, entry);
}

function otpEmail(code, account) {
  const when = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jayapura",
    dateStyle: "long",
    timeStyle: "short",
  });
  const text = [
    "Halo,",
    "",
    `Kode OTP untuk mengganti password admin Zanclus Dive Center (${account.email}):`,
    "",
    code,
    "",
    `Kode berlaku ${otpMinutes} menit dan hanya bisa dipakai sekali. Diminta pada ${when} WIT.`,
    "Jika kamu tidak meminta kode ini, abaikan email ini. Password tidak berubah tanpa kode ini.",
    "",
    "Zanclus Dive Center",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#062b3b;line-height:1.6">
<p>Halo,</p>
<p>Kode OTP untuk mengganti password admin Zanclus Dive Center (${account.email.replace(/[<>&"]/g, "")}):</p>
<p style="font-size:30px;font-weight:700;letter-spacing:8px;margin:18px 0">${code}</p>
<p>Kode berlaku ${otpMinutes} menit dan hanya bisa dipakai sekali. Diminta pada ${when} WIT.</p>
<p style="color:#5d7770">Jika kamu tidak meminta kode ini, abaikan email ini. Password tidak berubah tanpa kode ini.</p>
<p>Zanclus Dive Center</p>
</div>`;
  return {
    subject: `${code} adalah kode OTP admin Zanclus`,
    text,
    html,
  };
}

// { action: "send" } emails a code; { action: "change", code, password }
// sets the new password. Signed in, it is the signed-in account; on the
// login page ("Lupa password") the email is given, and the answer never says
// whether it belongs to an account.
export async function POST(request) {
  if (!sameOrigin(request))
    return reply({ error: "Permintaan dari origin lain ditolak." }, 403);
  if (!authConfigured())
    return reply(
      { error: "Login belum dikonfigurasi. Ikuti panduan CMS Hostinger." },
      503,
    );
  let data;
  try {
    data = await jsonBody(request, 4000);
  } catch {
    return reply({ error: "Data tidak valid." }, 400);
  }
  try {
    const admin = await currentAdmin();
    const forgot = !admin;
    if (forgot) allowForgot(request);
    const email = admin
      ? admin.email
      : typeof data.email === "string"
        ? data.email.slice(0, 250)
        : "";
    const account = email ? await findAccount(email) : null;
    if (data.action === "send") {
      if (!mailConfigured())
        return reply({ error: notConfigured, mail: mailIssues() }, 503);
      if (!account) return reply({ ok: true, message: forgotSent });
      const to = otpRecipient(account);
      const code = issueOtp(account.email);
      try {
        await sendMail({ to, ...otpEmail(code, account) });
      } catch (error) {
        dropOtp(account.email);
        console.error("OTP email failed:", error?.code || error?.message);
        return reply({ error: mailFailure(error) }, 502);
      }
      return reply(
        forgot
          ? { ok: true, message: forgotSent, minutes: otpMinutes }
          : { ok: true, recipient: maskEmail(to), minutes: otpMinutes },
      );
    }
    if (data.action === "change") {
      if (!account)
        throw new OtpError("Kode OTP sudah tidak berlaku. Minta kode baru.");
      if (typeof data.password !== "string")
        return reply({ error: "Isi password baru." }, 400);
      const problem = passwordProblem(account.email, data.password);
      if (problem) return reply({ error: problem }, 400);
      checkOtp(account.email, data.code);
      const updated = await changePassword(account, data.password);
      await clearLoginFailures().catch(() => {});
      // Other sessions end; this browser stays signed in.
      (await cookies()).set(COOKIE, sessionToken(updated), cookieOptions());
      return reply({ ok: true });
    }
    return reply({ error: "Data tidak valid." }, 400);
  } catch (error) {
    if (error instanceof OtpError)
      return reply({ error: error.message }, error.status);
    return apiFailure(error);
  }
}
