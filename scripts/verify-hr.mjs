import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// The HRD module: employees, daily attendance, payslips and Excel exports,
// by the superadmin and an HRD account; refused for others. Start the demo
// server as for verify-password.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
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
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Jayapura",
});
const month = today.slice(0, 7);
const yesterday = new Date(Date.parse(today + "T12:00:00Z") - 864e5)
  .toISOString()
  .slice(0, 10);
try {
  const admin = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  assert.equal((await login(admin, demoAccount)).status(), 200);
  const page = await admin.newPage();
  page.on("pageerror", (error) => errors.push(error.message));

  // Pegawai: one from the form, one through the API.
  await page.goto(base + "/admin/employees", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").textContent(), "Pegawai");
  await page.getByText("Belum ada pegawai.").waitFor();
  await page.getByLabel("Nama lengkap").fill("Siti Rahma");
  await page.getByLabel("Jabatan").fill("Divemaster");
  await page.getByLabel("Jenis kepegawaian").selectOption("tetap");
  await page.getByLabel("Mulai bekerja").fill("2026-01-10");
  await page.getByLabel("Nomor WhatsApp").fill("+62 812-3456-7890");
  await page.getByLabel("Gaji pokok per bulan").fill("4000000");
  await page.getByLabel("Potongan per hari tanpa keterangan").fill("100000");
  await page.getByRole("button", { name: "+ Tambah tunjangan" }).click();
  await page.getByLabel("Nama tunjangan tetap 1").fill("Makan");
  await page.getByLabel("Jumlah tunjangan tetap 1").fill("500000");
  await page.getByLabel("BPJS Kesehatan").check();
  await page.getByLabel("Bank").fill("BRI");
  await page.getByLabel("Nomor rekening").fill("123456789");
  await page.getByRole("button", { name: "Simpan pegawai" }).click();
  await page
    .getByText("Siti Rahma sudah ditambahkan sebagai pegawai.")
    .waitFor();
  assert.match(
    await page.locator(".admin-hr-table").textContent(),
    /Siti Rahma[\s\S]*Divemaster[\s\S]*Pegawai tetap[\s\S]*Rp\s4\.000\.000[\s\S]*\+ 1 tunjangan[\s\S]*Aktif/,
  );
  const budi = await (
    await call(admin, "/api/admin/hr/employees", "POST", {
      name: "Budi Santoso",
      position: "Kapten kapal",
      joinDate: "2026-03-01",
      type: "harian",
      salary: { dailyRate: 150000 },
    })
  ).json();
  assert.match(budi.id, /^emp:[0-9a-f]{12}$/);
  const bad = await call(admin, "/api/admin/hr/employees", "POST", {
    name: "X",
    position: "Y",
    joinDate: "2026-02-30",
  });
  assert.equal(bad.status(), 400);
  assert.match((await bad.json()).error, /tanggal mulai/);
  const employees = (
    await (await call(admin, "/api/admin/hr/employees")).json()
  ).employees;
  assert.equal(employees.length, 2);
  const siti = employees.find((e) => e.name === "Siti Rahma");
  assert.deepEqual(siti.salary.allowances, [
    { label: "Makan", amount: 500000 },
  ]);
  assert.equal(siti.insurance.bpjsKesehatan, true);
  await page.screenshot({ path: shots + "/admin-hr-employees.png" });

  // Absensi: today from the page, yesterday through the API.
  await page.goto(base + "/admin/attendance", { waitUntil: "networkidle" });
  await page.getByLabel("Status Budi Santoso").waitFor();
  await page.getByLabel("Status Budi Santoso").selectOption("sakit");
  await page.getByLabel("Jam masuk Siti Rahma").fill("08:00");
  await page.getByLabel("Jam pulang Siti Rahma").fill("17:00");
  await page.getByLabel("Catatan Siti Rahma").fill("Kursus Open Water");
  await page.getByRole("button", { name: "Simpan absensi" }).click();
  await page.getByText(/Absensi .* tersimpan untuk 2 pegawai/).waitFor();
  assert.equal(
    await page.getByLabel("Jam masuk Budi Santoso").isDisabled(),
    true,
  );
  const saved = await call(admin, "/api/admin/hr/attendance", "POST", {
    date: yesterday,
    rows: [
      { employeeId: siti.id, status: "alpa" },
      {
        employeeId: budi.id,
        status: "hadir",
        timeIn: "07:30",
        timeOut: "16:00",
      },
    ],
  });
  assert.equal(saved.status(), 200);
  const wrong = await call(admin, "/api/admin/hr/attendance", "POST", {
    date: today,
    rows: [
      {
        employeeId: siti.id,
        status: "hadir",
        timeIn: "18:00",
        timeOut: "08:00",
      },
    ],
  });
  assert.equal(wrong.status(), 400);
  assert.match((await wrong.json()).error, /setelah jam masuk/);
  // The month view counts both days (when yesterday is in this month).
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Status Budi Santoso").waitFor();
  assert.equal(
    await page.getByLabel("Catatan Siti Rahma").inputValue(),
    "Kursus Open Water",
  );
  const sameMonth = yesterday.slice(0, 7) === month;
  const summary = await page
    .locator(".admin-card")
    .nth(1)
    .locator(".admin-hr-table")
    .textContent();
  assert.match(
    summary,
    sameMonth ? /Budi Santoso[\s\S]*1[\s\S]*1/ : /Budi Santoso/,
  );
  await page.screenshot({ path: shots + "/admin-hr-attendance.png" });

  // Slip gaji: computed, locked, exported.
  await page.goto(base + "/admin/payroll", { waitUntil: "networkidle" });
  const payroll = await (
    await call(admin, `/api/admin/hr/payroll?month=${month}`)
  ).json();
  const sitiSlip = payroll.slips.find((s) => s.employeeId === siti.id);
  const budiSlip = payroll.slips.find((s) => s.employeeId === budi.id);
  const sitiAlpa = sameMonth ? 1 : 0;
  assert.equal(sitiSlip.basePay, 4000000);
  assert.equal(sitiSlip.gross, 4500000);
  assert.equal(sitiSlip.net, 4500000 - sitiAlpa * 100000);
  assert.equal(budiSlip.basePay, sameMonth ? 150000 : 0);
  assert.equal(sitiSlip.locked, false);
  await page.getByText("Siti Rahma").first().waitFor();
  await page
    .locator("tr", { hasText: "Siti Rahma" })
    .getByRole("button", { name: "Kunci (dibayar)" })
    .click();
  await page.getByText(/Slip Siti Rahma .* terkunci sebagai dibayar/).waitFor();
  await page
    .locator("tr", { hasText: "Siti Rahma" })
    .getByRole("button", { name: "Lihat slip" })
    .click();
  const slipCard = page.locator(".admin-payslip");
  await slipCard.waitFor();
  assert.match(
    await slipCard.textContent(),
    /Gaji pokok[\s\S]*Rp\s4\.000\.000[\s\S]*Makan[\s\S]*Diterima bersih/,
  );
  await page.screenshot({ path: shots + "/admin-hr-payroll.png" });
  // A raise after locking does not change the locked slip.
  assert.equal(
    (
      await call(admin, `/api/admin/hr/employees/${siti.id}`, "PUT", {
        salary: { ...siti.salary, base: 9000000 },
      })
    ).status(),
    200,
  );
  const after = await (
    await call(admin, `/api/admin/hr/payroll?month=${month}`)
  ).json();
  assert.equal(
    after.slips.find((s) => s.employeeId === siti.id).basePay,
    4000000,
  );
  assert.equal(after.slips.find((s) => s.employeeId === siti.id).locked, true);
  assert.equal(
    (
      await call(admin, "/api/admin/hr/payroll", "POST", {
        month,
        employeeId: siti.id,
        action: "unlock",
      })
    ).status(),
    200,
  );
  const reopened = await (
    await call(admin, `/api/admin/hr/payroll?month=${month}`)
  ).json();
  assert.equal(
    reopened.slips.find((s) => s.employeeId === siti.id).basePay,
    9000000,
  );
  for (const kind of ["payroll", "attendance", "employees"]) {
    const file = await call(
      admin,
      `/api/admin/hr/export?kind=${kind}&month=${month}`,
    );
    assert.equal(file.status(), 200, kind);
    assert.match(file.headers()["content-type"], /spreadsheetml/);
    assert.match(file.headers()["content-disposition"], /zanclus-.*\.xlsx/);
    const body = await file.body();
    assert.equal(body.slice(0, 2).toString(), "PK", kind);
    assert.ok(body.toString("latin1").includes("Siti Rahma"), kind);
  }
  assert.equal(
    (
      await call(admin, "/api/admin/hr/export?kind=payroll&month=2026-13")
    ).status(),
    400,
  );

  // An HRD account works the same pages; PR is refused.
  assert.equal(
    (
      await call(admin, "/api/admin/users", "POST", {
        name: "Dewi",
        email: "dewi@zanclus.test",
        role: "hrd",
        password: "Urus-Pegawai-2026",
      })
    ).status(),
    201,
  );
  const hrd = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  assert.equal(
    (
      await login(hrd, {
        email: "dewi@zanclus.test",
        password: "Urus-Pegawai-2026",
      })
    ).status(),
    200,
  );
  const hp = await hrd.newPage();
  hp.on("pageerror", (error) => errors.push(error.message));
  await hp.goto(base + "/admin/payroll", { waitUntil: "networkidle" });
  await hp.getByText("Siti Rahma").first().waitFor();
  assert.ok(
    await hp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "no sideways scroll at 390px",
  );
  await hp.screenshot({
    path: shots + "/admin-hr-payroll-mobile.png",
    fullPage: true,
  });
  assert.equal((await call(hrd, "/api/admin/hr/employees")).status(), 200);
  assert.equal(
    (
      await call(admin, "/api/admin/users", "POST", {
        name: "Putri",
        email: "putri@zanclus.test",
        role: "pr",
        password: "Konten-PR-2026!",
      })
    ).status(),
    201,
  );
  const pr = await browser.newContext();
  assert.equal(
    (
      await login(pr, {
        email: "putri@zanclus.test",
        password: "Konten-PR-2026!",
      })
    ).status(),
    200,
  );
  for (const path of [
    "/api/admin/hr/employees",
    `/api/admin/hr/attendance?month=${month}`,
    `/api/admin/hr/payroll?month=${month}`,
    `/api/admin/hr/export?kind=payroll&month=${month}`,
  ])
    assert.equal((await call(pr, path)).status(), 403, path);

  // Switching an employee off removes them from new attendance and payroll.
  assert.equal(
    (
      await call(admin, `/api/admin/hr/employees/${budi.id}`, "PUT", {
        active: false,
      })
    ).status(),
    200,
  );
  const later = await (
    await call(admin, `/api/admin/hr/payroll?month=${month}`)
  ).json();
  assert.equal(
    later.slips.some((s) => s.employeeId === budi.id),
    false,
  );
  assert.equal(
    (
      await call(admin, `/api/admin/hr/employees/${budi.id}`, "DELETE")
    ).status(),
    200,
  );
  assert.equal(
    (
      await call(admin, `/api/admin/hr/employees/${budi.id}`, "DELETE")
    ).status(),
    404,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS hr: employee from the form with allowance, BPJS and bank, another through the API, invalid date refused, today's attendance from the page and yesterday's through the API, wrong times refused, saved values reloaded, month summary, payslip computed from salary and absences, daily worker per day present, lock keeps the slip through a raise, unlock follows the new salary, Excel exports for payroll, attendance and employees, HRD account on a phone without sideways scroll, PR refused, inactive employee out of payroll, delete.",
  );
} finally {
  await browser.close();
}
