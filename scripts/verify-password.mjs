import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { startMockSmtp } from "./mock-smtp.mjs";

// Password change with a code sent by email, against a stand-in mail
// server. Start the demo server with:
// CMS_MODE=demo CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false
// SMTP_HOST=127.0.0.1 SMTP_PORT=3525 SMTP_SECURE=false
// SMTP_USER=web@zanclus.test SMTP_PASS=test ADMIN_OTP_EMAIL=pemilik@example.com
// ADMIN_EMAIL=pemilik@zanclus.test ADMIN_PASSWORD=Lama-Password-123
// npm start. No email leaves this machine.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const mock = startMockSmtp({
  port: Number(process.env.SMTP_MOCK_PORT || 3525),
});
const headers = { Origin: base };
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
const login = (context, account) =>
  context.request.post(base + "/api/admin/login", { headers, data: account });
const state = async (context) =>
  (await context.request.get(base + "/api/admin/state")).status();
const post = (context, data) =>
  context.request.post(base + "/api/admin/password", { headers, data });
const newPassword = "Laut-Biru-2026!";
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  assert.equal((await login(context, demoAccount)).status(), 200);
  // Another device signed in before the change.
  const other = await browser.newContext();
  assert.equal((await login(other, demoAccount)).status(), 200);

  // The account menu leads to the page.
  await page.goto(base + "/admin", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Akun" }).click();
  await page.getByRole("link", { name: "Ubah password" }).first().click();
  await page.waitForURL(base + "/admin/security");
  assert.equal(await page.locator("h1").textContent(), "Ubah password");
  await page
    .getByRole("heading", { name: "Ganti password dengan kode OTP email" })
    .waitFor();
  const intro = page.getByText(/Akun demo@zanclusdive\.com/);
  await intro.waitFor();
  assert.match(await intro.textContent(), /pe•••••@example\.com/);
  const save = page.getByRole("button", { name: "Simpan password baru" });
  assert.equal(await save.isDisabled(), true);

  await page.getByRole("button", { name: "Kirim kode OTP" }).click();
  await page
    .getByText(
      /Kode OTP sudah dikirim ke pe•••••@example\.com\. Berlaku 10 menit/,
    )
    .waitFor();
  assert.equal(mock.messages.length, 1);
  const sent = mock.messages[0];
  assert.deepEqual(sent.to, ["pemilik@example.com"]);
  assert.equal(sent.from, "web@zanclus.test");
  assert.match(sent.subject, /^\d{6} adalah kode OTP admin Zanclus$/);
  assert.match(sent.data, /demo@zanclusdive\.com/);
  assert.match(sent.data, /berlaku 10 menit/);
  const code = mock.lastCode();
  assert.match(
    await page
      .locator(".admin-password-steps li")
      .first()
      .locator("button")
      .textContent(),
    /^Kirim ulang dalam \d+ detik$/,
  );
  // A new code waits a minute.
  const again = await post(context, { action: "send" });
  assert.equal(again.status(), 429);
  assert.match((await again.json()).error, /1 menit/);

  const fill = async (otp, first, second = first) => {
    await page.getByLabel("Kode OTP (6 angka)").fill(otp);
    await page.getByLabel("Password baru", { exact: true }).fill(first);
    await page.getByLabel("Ulangi password baru").fill(second);
    await save.click();
  };
  await fill(code === "000000" ? "111111" : "000000", newPassword);
  await page.getByText("Kode OTP salah. Sisa 4 kali percobaan.").waitFor();
  await fill(code, newPassword, newPassword + "?");
  await page.getByText("Ulangi password baru dengan sama persis.").waitFor();
  // Too short is refused before the code is used.
  const short = await post(context, {
    action: "change",
    code,
    password: "pendek",
  });
  assert.equal(short.status(), 400);
  assert.match((await short.json()).error, /minimal 10 karakter/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no sideways scroll at 390px",
  );
  await page.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/admin-password-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await fill(code, newPassword);
  await page.getByText("Password berhasil diganti.").waitFor();
  await page.screenshot({
    path: (process.env.SHOT_DIR || "artifacts") + "/admin-password.png",
  });

  // This browser stays in; the other device is signed out.
  assert.equal(await state(context), 200);
  assert.equal(await state(other), 401);
  const fresh = await browser.newContext();
  assert.equal((await login(fresh, demoAccount)).status(), 401);
  assert.equal(
    (await login(fresh, { ...demoAccount, password: newPassword })).status(),
    200,
  );
  // The code worked once.
  const reused = await post(context, {
    action: "change",
    code,
    password: "Laut-Biru-2027!",
  });
  assert.equal(reused.status(), 400);
  assert.match((await reused.json()).error, /tidak berlaku/);
  // The password is never in the admin data.
  const data = await (
    await context.request.get(base + "/api/admin/state")
  ).text();
  assert.doesNotMatch(data, /"passwords"|"hash"|"salt"/);

  // Forgotten password, from the login page.
  const guest = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const login2 = await guest.newPage();
  login2.on("pageerror", (error) => errors.push(error.message));
  await login2.goto(base + "/admin", { waitUntil: "networkidle" });
  await login2
    .getByRole("button", { name: "Lupa password? Reset dengan kode OTP email" })
    .click();
  const forgotEmail = login2.getByLabel("Email operator");
  // An unknown email gets the same answer and no email.
  await forgotEmail.fill("bukan-akun@zanclus.test");
  await login2.getByRole("button", { name: "Kirim kode OTP" }).click();
  await login2.getByText(/Jika email itu terdaftar/).waitFor();
  assert.equal(mock.messages.length, 1);
  await login2.reload({ waitUntil: "networkidle" });
  await login2
    .getByRole("button", { name: "Lupa password? Reset dengan kode OTP email" })
    .click();
  await forgotEmail.fill("pemilik@zanclus.test");
  // The mail host refuses the login: the reason is shown, and the next try
  // is not held back.
  mock.refuseLogin = true;
  await login2.getByRole("button", { name: "Kirim kode OTP" }).click();
  await login2.getByText(/Server email menolak login SMTP/).waitFor();
  mock.refuseLogin = false;
  await login2.getByRole("button", { name: "Kirim kode OTP" }).click();
  await login2.getByText(/Jika email itu terdaftar/).waitFor();
  assert.equal(mock.messages.length, 2);
  assert.deepEqual(mock.messages[1].to, ["pemilik@example.com"]);
  assert.match(mock.messages[1].data, /pemilik@zanclus\.test/);
  await login2.getByLabel("Kode OTP (6 angka)").fill(mock.lastCode());
  await login2
    .getByLabel("Password baru", { exact: true })
    .fill("Pemilik-Baru-2026");
  await login2.getByLabel("Ulangi password baru").fill("Pemilik-Baru-2026");
  await login2.getByRole("button", { name: "Simpan password baru" }).click();
  // Signed in straight away.
  await login2.waitForURL(base + "/admin");
  await login2.getByRole("button", { name: "Akun" }).waitFor();
  const check = await browser.newContext();
  assert.equal(
    (
      await login(check, {
        email: "pemilik@zanclus.test",
        password: "Lama-Password-123",
      })
    ).status(),
    401,
  );
  assert.equal(
    (
      await login(check, {
        email: "pemilik@zanclus.test",
        password: "Pemilik-Baru-2026",
      })
    ).status(),
    200,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS password: account menu link, code emailed to ADMIN_OTP_EMAIL (masked on the page), one-minute resend wait, wrong code with tries left, mismatch and short password refused, change keeps this browser signed in and signs other devices out, old password refused and new one accepted, code used once, nothing in the admin data, 390px without sideways scroll, forgotten password from the login page (unknown email gets the same answer and no email, refused SMTP login explained, reset signs in). No email left this machine.",
  );
} finally {
  await browser.close();
  mock.server.close();
}
