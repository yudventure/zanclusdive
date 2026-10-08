import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { chromium } from "@playwright/test";
import { mysqlSettings } from "../src/cms-config.js";

assert.ok(process.env.MYSQL_DATABASE?.endsWith("_test"), "Use a dedicated local test database.");
assert.equal(process.env.CMS_MODE, "mysql", "Database diagnosis tests require CMS_MODE=mysql.");
const base = process.env.BASE_URL;
const badBase = process.env.BAD_DATABASE_BASE_URL;
assert.ok(base && badBase, "Provide BASE_URL (working database) and BAD_DATABASE_BASE_URL (incorrect database password).");
const credentials = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const pool = await mysql.createConnection(mysqlSettings());
async function snapshot() {
  const [records] = await pool.query("SELECT id,kind,payload,version FROM zanclus_records ORDER BY id");
  const [media] = await pool.query("SELECT id,OCTET_LENGTH(data) AS bytes FROM zanclus_media ORDER BY id");
  const [attempts] = await pool.query("SELECT * FROM zanclus_login_attempts ORDER BY id");
  return { records, media, attempts };
}
async function check(origin, data = credentials, headerOrigin = origin) {
  const response = await fetch(origin + "/api/admin/database-check", {
    method: "POST", headers: { Origin: headerOrigin, "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  return { response, body: await response.json() };
}
let browser;
try {
  const before = await snapshot();
  const denied = await check(base, { ...credentials, password: "incorrect-local-admin-value" });
  assert.equal(denied.response.status, 401);
  assert.equal(denied.body.target, undefined);
  assert.equal((await check(base, credentials, "https://other.example.test")).response.status, 403);
  const good = await check(base);
  assert.equal(good.response.status, 200);
  assert.equal(good.body.ok, true);
  assert.equal(good.body.target.host, mysqlSettings().host);
  assert.equal(good.body.tables.length, 3);
  assert.ok(good.body.identity.account);
  assert.equal(good.response.headers.get("set-cookie"), null);
  assert.equal(good.response.headers.get("cache-control"), "no-store");
  for (const key of ["MYSQL_PASSWORD", "ADMIN_PASSWORD", "SESSION_SECRET"])
    assert.ok(!JSON.stringify(good.body).includes(process.env[key]));
  const broken = await check(badBase);
  assert.equal(broken.response.status, 503);
  assert.equal(broken.body.code, "ER_ACCESS_DENIED_ERROR");
  assert.ok(broken.body.connectingHost);
  assert.ok(!JSON.stringify(broken.body).includes("wrong-local-db-password"));
  const overrideDenied = await check(base, { ...credentials, password: "incorrect-local-admin-value", mysqlPassword: process.env.MYSQL_PASSWORD });
  assert.equal(overrideDenied.response.status, 401);
  assert.equal(overrideDenied.body.passwordTest, undefined);
  const override = await check(badBase, { ...credentials, mysqlPassword: process.env.MYSQL_PASSWORD });
  assert.equal(override.response.status, 200);
  assert.equal(override.body.passwordTest.source, "form");
  assert.equal(override.body.passwordTest.matchesRuntime, false);
  assert.ok(!JSON.stringify(override.body).includes(process.env.MYSQL_PASSWORD));
  assert.equal((await check(badBase)).response.status, 503, "Password override must never be persisted.");
  assert.deepEqual(await snapshot(), before, "Diagnostics must not change records, media, or login failures.");

  browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(badBase + "/admin");
  await page.locator("input[name=email]").fill(credentials.email);
  await page.locator("input[name=password]").fill(credentials.password);
  await page.getByRole("button", { name: "Periksa koneksi database" }).click();
  await page.locator(".admin-db-diagnostic pre").filter({ hasText: "ER_ACCESS_DENIED_ERROR" }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.getByText("Uji dengan password MySQL langsung", { exact: true }).click();
  await page.locator('input[name="mysqlPassword"]').fill(process.env.MYSQL_PASSWORD);
  await page.getByRole("button", { name: "Periksa koneksi database" }).click();
  await page.getByRole("heading", { name: "Koneksi database berhasil." }).waitFor();
  await page.getByText("Password uji berhasil, tetapi berbeda", { exact: false }).waitFor();
  assert.equal(await page.locator('input[name="mysqlPassword"]').inputValue(), "");
  assert.ok(!(await page.locator('.admin-db-diagnostic').textContent()).includes(process.env.MYSQL_PASSWORD));
  await page.goto(base + "/admin");
  await page.locator("input[name=email]").fill(credentials.email);
  await page.locator("input[name=password]").fill(credentials.password);
  await page.getByRole("button", { name: "Periksa koneksi database" }).click();
  await page.getByRole("heading", { name: "Koneksi database berhasil." }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.deepEqual(await snapshot(), before);
  for (let i = 0; i < 3; i++) assert.equal((await check(badBase)).response.status, 503);
  assert.equal((await check(badBase)).response.status, 429);
  console.log("PASS database diagnosis: admin credential protection, CSRF, runtime target, real MySQL success/denial, connecting host, no secrets/session, read-only queries, rate limit, mobile UI.");
} finally {
  await browser?.close();
  await pool.end();
}
