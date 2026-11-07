import "server-only";
import nodemailer from "nodemailer";

// Email from the website, through the SMTP account set in the hosting
// panel (Hostinger email: smtp.hostinger.com, port 465).
const env = (name) => process.env[name]?.trim() || "";
export function mailIssues() {
  const issues = [];
  if (!env("SMTP_HOST")) issues.push("SMTP_HOST");
  if (!env("SMTP_USER")) issues.push("SMTP_USER");
  if (!process.env.SMTP_PASS) issues.push("SMTP_PASS");
  return issues;
}
export const mailConfigured = () => mailIssues().length === 0;
// The address guests see the email from.
export const mailSender = () =>
  env("SMTP_FROM") ||
  (env("SMTP_USER") ? `"Zanclus Dive Center" <${env("SMTP_USER")}>` : "");

// Where codes go: a staff account's own inbox; for the built-in accounts
// ADMIN_OTP_EMAIL, or their own email.
export const otpRecipient = (account) =>
  account.kind === "user"
    ? account.email
    : env("ADMIN_OTP_EMAIL") || account.email;

// "ku••••••@gmail.com", so the page shows where the code went without
// printing the whole address.
export function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  if (!domain) return "••••";
  return `${name.slice(0, 2)}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

export async function sendMail({ to, subject, text, html, bcc, replyTo }) {
  const port = Number(env("SMTP_PORT") || 465);
  const transport = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    secure: env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465,
    auth: { user: env("SMTP_USER"), pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  const from = mailSender();
  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
    ...(bcc ? { bcc } : {}),
    ...(replyTo ? { replyTo } : {}),
  });
}

// Why a send failed, in words the owner can act on.
export function mailFailure(error) {
  const code = error?.code || error?.responseCode || "";
  if (code === "EAUTH" || error?.responseCode === 535)
    return "Server email menolak login SMTP. Periksa SMTP_USER dan SMTP_PASS di hPanel.";
  if (
    ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNREFUSED"].includes(
      code,
    )
  )
    return "Server email tidak bisa dihubungi. Periksa SMTP_HOST dan SMTP_PORT di hPanel.";
  return "Email belum bisa dikirim. Periksa pengaturan SMTP di hPanel.";
}
