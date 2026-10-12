import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Run against a server started like production (no CMS_DEMO_LOGIN) with
// OPERATOR_PASSWORD set in this shell only. The password is never stored.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
const password = process.env.OPERATOR_PASSWORD;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert.ok(password, "Set OPERATOR_PASSWORD for this run.");
const headers = { Origin: new URL(base).origin };
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  // Footer offers the operator sign-in instead of "back to top".
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  const link = page.locator(".site-footer-operator");
  assert.equal(await link.textContent(), "Masuk operator");
  assert.equal(
    await page.locator(".site-footer-top, .site-footer-demo").count(),
    0,
  );
  await link.click();
  await page.waitForURL(base + "/admin");
  // The login form is empty and the public demo account no longer works.
  assert.equal(await page.locator('input[name="email"]').inputValue(), "");
  assert.equal(
    await page.locator('input[name="email"]').getAttribute("readonly"),
    null,
  );
  assert.equal(await page.getByText("Periksa koneksi database").count(), 0);
  const demo = await context.request.post(base + "/api/admin/login", {
    headers,
    data: demoAccount,
  });
  assert.equal(demo.status(), 401);
  await page.fill('input[name="email"]', "operator@zanclusdive.com");
  await page.fill('input[name="password"]', "wrong-password-123");
  await page.getByRole("button", { name: /Masuk/ }).click();
  await page.getByText("Email atau password tidak sesuai.").waitFor();
  await page.fill('input[name="email"]', " Operator@ZanclusDive.com ");
  // Pasted with a stray space, and with an old ADMIN_EMAIL left on the host.
  await page.fill('input[name="password"]', ` ${password} `);
  await page.getByRole("button", { name: /Masuk/ }).click();
  await page.waitForURL(base + "/admin");
  await page.getByRole("link", { name: /Foto & media/ }).waitFor();
  assert.equal(
    (await context.request.get(base + "/api/admin/state")).status(),
    200,
  );
  // An ADMIN_EMAIL/ADMIN_PASSWORD pair on the host works alongside it.
  if (process.env.EXTRA_ADMIN_EMAIL) {
    const extra = await browser.newContext();
    assert.equal(
      (
        await extra.request.post(base + "/api/admin/login", {
          headers,
          data: {
            email: process.env.EXTRA_ADMIN_EMAIL,
            password: process.env.EXTRA_ADMIN_PASSWORD,
          },
        })
      ).status(),
      200,
    );
    await extra.close();
  }
  // A forged cookie for another email is rejected.
  const forged = Buffer.from(
    JSON.stringify({ email: demoAccount.email, expires: Date.now() + 3600000 }),
  ).toString("base64url");
  const other = await browser.newContext();
  await other.addCookies([
    { name: "zanclus_admin_session", value: forged + ".x", url: base },
  ]);
  assert.equal(
    (await other.request.get(base + "/api/admin/state")).status(),
    401,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS operator: footer sign-in link, empty login form, public demo login rejected, wrong password rejected, operator signs in, forged session rejected.",
  );
} finally {
  await browser.close();
}
