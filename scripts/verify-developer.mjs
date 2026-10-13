import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Developer mode, the maintenance page and the error pages. Run against a
// production build of a local demo server with demo login:
// CMS_MODE=demo CMS_DEMO_LOGIN=true CMS_COOKIE_SECURE=false npm start
// Changes developer mode and switches it off again at the end.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
async function open(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  await context.route("**/api/weather", (r) =>
    r.fulfill({ json: { locations: [] } }),
  );
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push(error.message));
  return { context, page };
}
const status = (page) =>
  page.locator("[data-status]").first().getAttribute("data-status");

const admin = await open();
const visitor = await open();
try {
  // Error and status pages exist in both languages.
  for (const [path, code, kind, heading] of [
    ["/status/404.html", 200, "404", "This page drifted off"],
    ["/status/403.html?lang=id", 200, "403", "Area ini khusus tim Zanclus"],
    ["/status/500.html", 200, "500", "Something got tangled"],
    ["/status/502.html?lang=id", 200, "502", "Sambungan ke server"],
    ["/status/503.html", 200, "503", "Our server is taking a short break"],
    ["/status/504.html", 200, "504", "The server took too long"],
    ["/status/offline.html?lang=id", 200, "offline", "Sinyal internetmu"],
    ["/maintenance?lang=id", 503, "maintenance", "Website sedang kami rawat"],
    ["/tidak-ada-halaman-ini", 404, "404", "This page drifted off"],
    ["/id/diving/tidak-ada", 404, "404", "Halaman ini hanyut"],
  ]) {
    const response = await visitor.page.goto(base + path);
    assert.equal(response.status(), code, path);
    assert.equal(await status(visitor.page), kind, path);
    assert.match(
      await visitor.page.locator("h1").textContent(),
      new RegExp(heading),
      path,
    );
  }
  assert.equal(
    (await visitor.context.request.get(base + "/status/nope.html")).status(),
    404,
  );

  // Admin: switch on developer mode and lock the whole website.
  assert.equal(
    (
      await admin.context.request.post(base + "/api/admin/login", {
        headers: { Origin: base },
        data: demoAccount,
      })
    ).status(),
    200,
  );
  const a = admin.page;
  // The switch is styled; click its label like a visitor would.
  const setSwitch = async (on) => {
    if ((await a.getByRole("switch").isChecked()) !== on)
      await a.locator(".admin-dev-switch").click();
    assert.equal(await a.getByRole("switch").isChecked(), on);
  };
  await a.goto(base + "/admin/developer", { waitUntil: "networkidle" });
  await a.getByRole("heading", { name: "Kunci sebagian" }).waitFor();
  await setSwitch(true);
  await a.getByLabel("Tutup seluruh website untuk pengunjung").check();
  await a
    .getByLabel("Pesan untuk pengunjung (Indonesia)")
    .fill("Katalog alat selam baru sedang disiapkan.");
  await a
    .getByLabel("Message for visitors (English)")
    .fill("The new dive gear catalogue is on its way.");
  await a
    .getByLabel("Perkiraan selesai (WIT, opsional)")
    .fill("2030-01-02T09:30");
  await a
    .getByRole("button", { name: "Simpan mode developer" })
    .first()
    .click();
  await a.getByText("Mode developer tersimpan").waitFor();
  assert.match(
    await a.locator(".admin-dev-status").textContent(),
    /Seluruh website terkunci/,
  );

  // Visitors get the maintenance page with a 503; the admin keeps the site.
  const v = visitor.page;
  for (const [path, heading, note] of [
    [
      "/",
      "We're giving the website a quick service.",
      "The new dive gear catalogue",
    ],
    [
      "/id/dive-shop",
      "Website sedang kami rawat sebentar.",
      "Katalog alat selam baru",
    ],
    ["/nothing-here", "We're giving the website a quick service.", "catalogue"],
  ]) {
    const response = await v.goto(base + path);
    assert.equal(response.status(), 503, path);
    assert.ok(Number(response.headers()["retry-after"]) >= 300);
    assert.equal(await v.locator("h1").textContent(), heading);
    assert.match(await v.locator(".zs-note").textContent(), new RegExp(note));
    assert.match(await v.locator(".zs-until").textContent(), /WIT/);
  }
  assert.equal((await v.goto(base + "/admin")).status(), 200, "admin open");
  await a.goto(base + "/", { waitUntil: "networkidle" });
  assert.equal(await a.locator(".hero").count(), 1);
  assert.match(
    await a.locator(".dev-bar").textContent(),
    /Seluruh website terkunci/,
  );

  // Lock one page, two sections, a product and a service instead.
  await a.goto(base + "/admin/developer", { waitUntil: "networkidle" });
  await a.getByLabel("Tutup seluruh website untuk pengunjung").uncheck();
  for (const label of [
    "Snorkeling/snorkeling",
    "Dive Shop/dive-shop",
    "Cara menuju ke sini",
    "Video YouTube",
    "Open heel fins",
    "Servis BCD",
  ])
    await a
      .locator(".admin-dev-choice", { hasText: label })
      .locator("input")
      .check();
  await a.getByRole("button", { name: "Simpan mode developer" }).last().click();
  await a.getByText("Mode developer tersimpan").waitFor();
  assert.match(await a.locator(".admin-dev-status").textContent(), /6 kunci/);

  let response = await v.goto(base + "/dive-shop");
  assert.equal(response.status(), 503);
  assert.equal(await status(v), "page");
  assert.equal(
    await v.getByRole("link", { name: "Back to home" }).getAttribute("href"),
    "/",
  );
  response = await v.goto(base + "/", { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  assert.equal(await v.locator('[data-locked="travel"]').count(), 1);
  assert.equal(await v.locator(".travel-section").count(), 0);
  assert.equal(
    await v
      .locator('.course-card.is-locked[data-activity="snorkeling"]')
      .count(),
    1,
  );
  assert.equal(
    await v.locator('a.course-card[data-activity="snorkeling"]').count(),
    0,
  );
  const fins = v.locator(".shop-item.is-locked");
  assert.equal(await fins.count(), 1);
  assert.match(await fins.textContent(), /Being updated/);
  assert.equal(await fins.locator("button").count(), 0, "no add button");
  response = await v.goto(base + "/id/service", { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  assert.ok(await v.locator("#bcd.is-locked button").isDisabled());
  assert.equal(
    await v.locator('input[name="services"][value="bcd"]').count(),
    0,
  );
  assert.equal(
    await v.locator('input[name="services"][value="regulator"]').count(),
    1,
  );

  // Switching developer mode off opens everything and keeps the choices.
  await a.goto(base + "/admin/developer", { waitUntil: "networkidle" });
  await setSwitch(false);
  await a
    .getByRole("button", { name: "Simpan mode developer" })
    .first()
    .click();
  await a.getByText("Mode developer tersimpan").waitFor();
  assert.ok(
    await a
      .locator(".admin-dev-choice", { hasText: "Servis BCD" })
      .locator("input")
      .isChecked(),
  );
  assert.equal((await v.goto(base + "/dive-shop")).status(), 200);
  await v.goto(base + "/", { waitUntil: "networkidle" });
  assert.equal(await v.locator("[data-locked]").count(), 0);
  assert.equal(await v.locator(".is-locked").count(), 0);

  // Offline: the service worker shows the offline page, and the notice
  // appears on an open page.
  const sw = await open();
  await sw.page.goto(base + "/id", { waitUntil: "networkidle" });
  await sw.page.evaluate(() => navigator.serviceWorker.ready);
  await sw.page.reload({ waitUntil: "networkidle" });
  await sw.context.setOffline(true);
  await sw.page.locator(".connection-offline").waitFor();
  await sw.page.goto(base + "/id/diving").catch(() => {});
  assert.equal(await status(sw.page), "offline");
  assert.match(await sw.page.locator("h1").textContent(), /Sinyal internetmu/);
  await sw.context.setOffline(false);
  await sw.page.waitForURL(base + "/id/diving");
  await sw.page.locator(".hero, .activity-hero, main").first().waitFor();
  // A 504 from the hosting becomes our own 504 page.
  await sw.context.route(base + "/trip", (r) =>
    r.fulfill({ status: 504, body: "Gateway Timeout" }),
  );
  response = await sw.page.goto(base + "/trip");
  assert.equal(response.status(), 504);
  assert.equal(await status(sw.page), "504");
  await sw.context.close();

  // Phone: the maintenance page fits.
  const phone = await open({ viewport: { width: 390, height: 844 } });
  await phone.page.goto(base + "/maintenance?lang=id");
  assert.ok(
    await phone.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await phone.context.close();
  assert.deepEqual([...a.errors, ...v.errors], []);
  console.log(
    "PASS developer: 404/403/500/502/503/504/offline pages in both languages, real 404s, whole-site lock with 503, Retry-After, note and WIT time, admin keeps the site with a bar, page lock with home link, homepage section, experience card, product and service locks, switching off keeps choices, offline page and notice from the service worker, our 504 page for a gateway timeout, 390px maintenance page.",
  );
} finally {
  await browser.close();
}
