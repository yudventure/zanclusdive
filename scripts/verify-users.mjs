import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";
import { startMockSmtp } from "./mock-smtp.mjs";

// Staff accounts and roles: who sees which menu, which API each role may
// call, and the superadmin's user management. Start the demo server as
// for verify-password (SMTP on 127.0.0.1:3525, ADMIN_OTP_EMAIL set).
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const mock = startMockSmtp({
  port: Number(process.env.SMTP_MOCK_PORT || 3525),
});
const headers = { Origin: base };
const shots = process.env.SHOT_DIR || "artifacts";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const errors = [];
const login = (context, account) =>
  context.request.post(base + "/api/admin/login", { headers, data: account });
const call = (context, path, method = "GET", data) =>
  context.request.fetch(base + path, {
    method,
    headers,
    ...(data ? { data } : {}),
  });
const state = (context) => call(context, "/api/admin/state");
const links = async (page) =>
  page
    .locator(".admin-links a")
    .evaluateAll((list) => list.map((a) => a.textContent.trim()));
const groups = async (page) =>
  page
    .locator(".admin-menu-title")
    .evaluateAll((list) => list.map((p) => p.textContent.trim()));
const watch = (page) =>
  page.on("pageerror", (error) => errors.push(error.message));
try {
  // The built-in demo account is a superadmin.
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  assert.equal((await login(admin, demoAccount)).status(), 200);
  const own = await (await state(admin)).json();
  assert.equal(own.account.role, "superadmin");
  assert.ok(own.account.areas.includes("users"));
  const page = await admin.newPage();
  watch(page);
  await page.goto(base + "/admin/users", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").textContent(), "Pengguna & peran");
  assert.deepEqual(await groups(page), [
    "Operasional",
    "Website & PR",
    "HRD",
    "Finance",
    "Gudang",
    "Pengaturan",
  ]);
  await page.getByText("Akun bawaan").first().waitFor();
  assert.match(
    await page.locator(".admin-user-table").textContent(),
    /demo@zanclusdive\.com[\s\S]*Superadmin[\s\S]*Diatur di hPanel/,
  );
  await page.getByRole("button", { name: "Akun" }).click();
  await page.getByText("Peran: Superadmin").waitFor();
  await page.getByRole("button", { name: "Akun" }).click();

  // A new HRD account from the form.
  await page.getByLabel("Nama").fill("Siti Rahma");
  await page.getByLabel("Email login").fill("Siti@zanclus.test");
  await page.getByLabel("Peran").selectOption("hrd");
  await page.getByLabel("Password awal").fill("Rahasia-HRD-2026");
  await page.getByRole("button", { name: "Simpan pengguna" }).click();
  await page.getByText(/Pengguna Siti Rahma sudah dibuat/).waitFor();
  assert.match(
    await page.locator(".admin-user-table").textContent(),
    /Siti Rahma[\s\S]*siti@zanclus\.test[\s\S]*HRD[\s\S]*Aktif/,
  );
  await page.screenshot({ path: shots + "/admin-users.png", fullPage: true });
  // Others through the API, and the refusals.
  const make = (data) => call(admin, "/api/admin/users", "POST", data);
  const putri = await (
    await make({
      name: "Putri",
      email: "putri@zanclus.test",
      role: "pr",
      password: "Konten-PR-2026!",
    })
  ).json();
  assert.equal(putri.roleLabel, "PR");
  const fina = await (
    await make({
      name: "Fina",
      email: "fina@zanclus.test",
      role: "finance",
      password: "Angka-Finance-2026",
    })
  ).json();
  assert.equal(fina.role, "finance");
  const manager = await (
    await make({
      name: "Manajer",
      email: "manajer@zanclus.test",
      role: "superadmin",
      password: "Kelola-Semua-2026",
    })
  ).json();
  assert.match(manager.id, /^user:[0-9a-f]{16}$/);
  for (const [data, status, pattern] of [
    [
      {
        email: "siti@zanclus.test",
        role: "pr",
        password: "Dobel-Email-2026",
      },
      409,
      /sudah dipakai/,
    ],
    [
      {
        email: demoAccount.email,
        role: "pr",
        password: "Dobel-Email-2026",
      },
      409,
      /sudah dipakai/,
    ],
    [{ email: "x@zanclus.test", role: "pr", password: "pendek" }, 400, /10/],
    [
      { email: "x@zanclus.test", role: "bos", password: "Panjang-Sekali-1" },
      400,
      /peran/,
    ],
    [
      { email: "bukan email", role: "pr", password: "Panjang-Sekali-1" },
      400,
      /email/,
    ],
  ]) {
    const response = await make(data);
    assert.equal(response.status(), status, JSON.stringify(data));
    assert.match((await response.json()).error, pattern);
  }
  const listed = await (await call(admin, "/api/admin/users")).json();
  assert.deepEqual(
    listed.users.map((u) => u.email),
    [
      "siti@zanclus.test",
      "putri@zanclus.test",
      "fina@zanclus.test",
      "manajer@zanclus.test",
    ],
  );
  // The code's operator account, the hosting panel's and the demo one.
  assert.deepEqual(
    listed.builtIn.map((u) => u.email),
    ["operator@zanclusdive.com", "pemilik@zanclus.test", demoAccount.email],
  );
  const siti = listed.users[0];
  assert.ok(!("hash" in siti) && !("salt" in siti) && !("password" in siti));

  // HRD: its own menu, nothing else.
  const hrd = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  assert.equal(
    (
      await login(hrd, {
        email: "siti@zanclus.test",
        password: "Rahasia-HRD-2026",
      })
    ).status(),
    200,
  );
  const hp = await hrd.newPage();
  watch(hp);
  await hp.goto(base + "/admin", { waitUntil: "networkidle" });
  await hp.getByRole("heading", { name: /, Siti Rahma$/ }).waitFor();
  assert.deepEqual(await groups(hp), ["HRD", "Pengaturan"]);
  assert.deepEqual(await links(hp), [
    "Ringkasan cepat",
    "HRD",
    "Ubah password",
  ]);
  assert.equal(
    await hp.getByRole("button", { name: "Notifikasi reservasi" }).count(),
    0,
  );
  assert.match(
    await hp.locator(".admin-sidebar-note").textContent(),
    /PERAN HRD/,
  );
  assert.match(await hp.locator(".admin-role-home").textContent(), /Peran HRD/);
  await hp.screenshot({ path: shots + "/admin-role-hrd.png" });
  await hp.goto(base + "/admin/hrd", { waitUntil: "networkidle" });
  await hp.getByText("Tahap 2 · Belum tersedia").waitFor();
  await hp.goto(base + "/admin/reservations", { waitUntil: "networkidle" });
  await hp.getByText("Bagian ini tidak tersedia untuk peran HRD").waitFor();
  const hrdState = await (await state(hrd)).json();
  assert.deepEqual(
    [
      hrdState.account.role,
      hrdState.bookings,
      hrdState.media,
      hrdState.agents,
      hrdState.payments,
    ],
    ["hrd", [], [], [], null],
  );
  assert.ok(hrdState.content?.calendar, "site content still comes along");
  for (const [path, method, data] of [
    ["/api/admin/bookings", "POST", { guestName: "x" }],
    ["/api/admin/settings", "PUT", { content: hrdState.content, version: 1 }],
    ["/api/admin/users", "GET"],
    ["/api/admin/agents", "GET"],
    ["/api/admin/payments", "POST", { action: "test" }],
    ["/api/admin/videos", "POST", { url: "https://youtu.be/x" }],
  ]) {
    const response = await call(hrd, path, method, data);
    assert.equal(response.status(), 403, path);
    assert.match(
      (await response.json()).error,
      /Peran HRD|tidak bisa mengubah/,
    );
  }
  // Its password code goes to its own inbox, not ADMIN_OTP_EMAIL.
  const info = await (await call(hrd, "/api/admin/password")).json();
  assert.equal(info.recipient, "si•••@zanclus.test");
  assert.equal(
    (
      await call(hrd, "/api/admin/password", "POST", { action: "send" })
    ).status(),
    200,
  );
  assert.deepEqual(mock.messages.at(-1).to, ["siti@zanclus.test"]);
  assert.equal(
    (
      await call(hrd, "/api/admin/password", "POST", {
        action: "change",
        code: mock.lastCode(),
        password: "Rahasia-Siti-2027",
      })
    ).status(),
    200,
  );
  assert.equal((await state(hrd)).status(), 200);

  // PR: the desk and the website, but no developer locks or users.
  const pr = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  assert.equal(
    (
      await login(pr, {
        email: "putri@zanclus.test",
        password: "Konten-PR-2026!",
      })
    ).status(),
    200,
  );
  const prState = await (await state(pr)).json();
  assert.equal(prState.account.role, "pr");
  assert.ok(prState.bookings.length > 0 && prState.media.length >= 0);
  assert.equal(prState.payments, null);
  const edited = structuredClone(prState.content);
  edited.developer = { ...edited.developer, enabled: true, site: true };
  edited.calendar.banners[0].note.id = "Minimal 6 pax";
  edited.payments = { ...edited.payments, enabled: !edited.payments?.enabled };
  const saved = await call(pr, "/api/admin/settings", "PUT", {
    content: edited,
    version: prState.version,
  });
  assert.equal(saved.status(), 200);
  const after = await (await state(admin)).json();
  assert.equal(after.content.developer.enabled, false, "locks kept");
  assert.equal(after.content.developer.site, false);
  assert.equal(after.content.calendar.banners[0].note.id, "Minimal 6 pax");
  assert.equal(
    Boolean(after.content.payments?.enabled),
    Boolean(prState.content.payments?.enabled),
    "payment switch kept",
  );
  const pp = await pr.newPage();
  watch(pp);
  await pp.goto(base + "/admin", { waitUntil: "networkidle" });
  assert.deepEqual(await groups(pp), [
    "Operasional",
    "Website & PR",
    "Pengaturan",
  ]);
  const prLinks = await links(pp);
  for (const name of [
    "Reservasi",
    "Agen & kalender",
    "Kalender konten",
    "Kalender kegiatan",
  ])
    assert.ok(prLinks.includes(name), name);
  for (const name of [
    "Mode developer",
    "Pengguna & peran",
    "HRD",
    "Pembayaran online",
  ])
    assert.ok(!prLinks.includes(name), "no " + name);
  await pp
    .getByRole("button", { name: "Pengaturan situs", exact: true })
    .waitFor();
  await pp.goto(base + "/admin/social", { waitUntil: "networkidle" });
  await pp.getByText("Tahap 5 · Belum tersedia").waitFor();
  assert.equal((await call(pr, "/api/admin/users")).status(), 403);

  // Finance: online payments only.
  const finance = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  assert.equal(
    (
      await login(finance, {
        email: "fina@zanclus.test",
        password: "Angka-Finance-2026",
      })
    ).status(),
    200,
  );
  const finState = await (await state(finance)).json();
  assert.equal(finState.account.role, "finance");
  assert.ok(finState.payments && "configured" in finState.payments);
  assert.ok(finState.bookings.every((b) => b.payment));
  const fp = await finance.newPage();
  watch(fp);
  await fp.goto(base + "/admin", { waitUntil: "networkidle" });
  assert.deepEqual(await links(fp), [
    "Ringkasan cepat",
    "Pembayaran online",
    "Keuangan",
    "Ubah password",
  ]);
  assert.equal(
    (await call(finance, "/api/admin/bookings", "POST", {})).status(),
    403,
  );

  // The superadmin changes roles, switches accounts off and resets passwords.
  const edit = (id, data) => call(admin, "/api/admin/users/" + id, "PUT", data);
  assert.equal((await edit(siti.id, { role: "finance" })).status(), 200);
  assert.equal((await (await state(hrd)).json()).account.role, "finance");
  assert.equal((await edit(siti.id, { active: false })).status(), 200);
  assert.equal((await state(hrd)).status(), 401, "switched off: session ends");
  assert.equal(
    (
      await login(await browser.newContext(), {
        email: "siti@zanclus.test",
        password: "Rahasia-Siti-2027",
      })
    ).status(),
    401,
  );
  assert.equal((await edit(siti.id, { active: true })).status(), 200);
  assert.equal((await state(hrd)).status(), 200, "switched on: session back");
  assert.equal(
    (await edit(siti.id, { password: "Reset-Oleh-Owner-1" })).status(),
    200,
  );
  assert.equal((await state(hrd)).status(), 401, "new password: session ends");
  const again = await browser.newContext();
  assert.equal(
    (
      await login(again, {
        email: "siti@zanclus.test",
        password: "Reset-Oleh-Owner-1",
      })
    ).status(),
    200,
  );
  assert.equal((await edit(siti.id, { password: "pendek" })).status(), 400);
  assert.equal(
    (await edit("user:ffffffffffffffff", { name: "x" })).status(),
    404,
  );
  // A superadmin made in the admin cannot lock itself out.
  const mgr = await browser.newContext();
  assert.equal(
    (
      await login(mgr, {
        email: "manajer@zanclus.test",
        password: "Kelola-Semua-2026",
      })
    ).status(),
    200,
  );
  const mine = (data) =>
    call(mgr, "/api/admin/users/" + manager.id, "PUT", data);
  assert.equal((await mine({ active: false })).status(), 400);
  assert.equal((await mine({ role: "pr" })).status(), 400);
  assert.equal(
    (await call(mgr, "/api/admin/users/" + manager.id, "DELETE")).status(),
    400,
  );
  assert.equal((await mine({ name: "Manajer Baru" })).status(), 200);
  assert.equal((await (await state(mgr)).json()).account.name, "Manajer Baru");

  // Deleting from the page: two taps, then the account is gone.
  await page.reload({ waitUntil: "networkidle" });
  const row = page.locator("tr", { hasText: "fina@zanclus.test" });
  await row.getByRole("button", { name: "Hapus" }).click();
  await row.getByRole("button", { name: "Yakin, hapus" }).click();
  await page.getByText("Pengguna Fina sudah dihapus.").waitFor();
  assert.equal((await state(finance)).status(), 401);
  assert.equal(
    (
      await login(await browser.newContext(), {
        email: "fina@zanclus.test",
        password: "Angka-Finance-2026",
      })
    ).status(),
    401,
  );
  // Editing from the page.
  await page
    .locator("tr", { hasText: "putri@zanclus.test" })
    .getByRole("button", { name: "Ubah" })
    .click();
  await page.getByRole("heading", { name: "Ubah pengguna: Putri" }).waitFor();
  assert.equal(await page.getByLabel("Email login").isDisabled(), true);
  await page.getByLabel("Nama").fill("Putri Ayu");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await page.getByText("Pengguna Putri Ayu sudah diperbarui.").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no sideways scroll at 390px",
  );
  await page.screenshot({
    path: shots + "/admin-users-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS users: superadmin menu by category, built-in account listed, HRD made from the form, PR/finance/superadmin made through the API, duplicate and invalid accounts refused, HRD sees only its menu and role overview, other pages and APIs refused with 403, OTP to its own inbox, PR keeps developer locks and the payment switch when saving content, finance sees payments only, role change applies at once, switching off ends the session, owner password reset ends the session, a superadmin cannot lock itself out, delete and edit from the page, 390px without sideways scroll.",
  );
} finally {
  await browser.close();
  mock.server.close();
}
