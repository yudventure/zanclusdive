import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// YouTube videos above the gallery button. Run against a local demo server
// with demo login: CMS_MODE=demo CMS_DEMO_LOGIN=true npm start
// YouTube itself is replaced by stand-ins, so nothing is fetched from it.
const base = process.env.BASE_URL || "http://127.0.0.1:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const thumbnail = await readFile(
  new URL("../public/assets/photos/fan-turtle.webp", import.meta.url),
);
const player = `<!doctype html><body style="margin:0;height:100vh;background:#0d4b5c;color:#fff;font:14px sans-serif;display:grid;place-items:center">player<script>
window.commands = [];
addEventListener("message", (e) => commands.push(JSON.parse(e.data).func));
</script>`;
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
async function open(options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    ...options,
  });
  await context.route("**/api/weather", (r) =>
    r.fulfill({ json: { locations: [] } }),
  );
  await context.route("https://i.ytimg.com/**", (r) =>
    r.fulfill({ contentType: "image/webp", body: thumbnail }),
  );
  await context.route("https://www.youtube-nocookie.com/**", (r) =>
    r.fulfill({ contentType: "text/html", body: player }),
  );
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push(error.message));
  return { context, page };
}
const links = [
  "https://youtube.com/shorts/aaaaaaaaaa1?si=share",
  "https://www.youtube.com/watch?v=bbbbbbbbbb2",
  "https://youtu.be/cccccccccc3",
];
const { context, page } = await open();
try {
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".dive-videos").count(), 0, "no videos yet");

  // Admin: paste links, see whether each is recognised, then save.
  assert.equal(
    (
      await context.request.post(base + "/api/admin/login", {
        headers,
        data: demoAccount,
      })
    ).status(),
    200,
  );
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Video YouTube (9:16)" }).waitFor();
  const add = page.getByRole("button", { name: "+ Tambah video" });
  await add.click();
  const fields = page.getByLabel("Link YouTube");
  await fields.nth(0).fill("https://vimeo.com/12345");
  await page.getByText("Link belum dikenali.").waitFor();
  await page.getByRole("button", { name: "Simpan video" }).click();
  await page.getByText("Link video 1 belum dikenali").waitFor();
  await add.click();
  await add.click();
  for (const [index, link] of links.entries())
    await fields.nth(index).fill(link);
  assert.equal(
    await page.getByText("Link dikenali. Simpan untuk menampilkan.").count(),
    3,
  );
  const videoCards = page.locator(".admin-video-item");
  await videoCards.nth(0).getByLabel("Keterangan (Indonesia)").fill("Manta");
  await videoCards.nth(0).getByLabel("Caption (English)").fill("Manta ray");
  await page.getByRole("button", { name: "Simpan video" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();

  // Homepage: between the ocean cards and the gallery button, 9:16, and the
  // players load only once the row comes near the screen.
  await page.goto(base, { waitUntil: "networkidle" });
  const row = page.locator(".dive-videos");
  assert.equal(await row.locator(".dive-video").count(), 3);
  assert.equal(await row.locator("iframe").count(), 0, "players load lazily");
  const top = async (selector) =>
    (await page.locator(selector).boundingBox()).y;
  assert.ok((await top(".ocean-grid")) < (await top(".dive-videos")));
  assert.ok((await top(".dive-videos")) < (await top(".dive-gallery-toggle")));
  await row.scrollIntoViewIfNeeded();
  await row.locator("iframe").nth(2).waitFor();
  const src = new URL(await row.locator("iframe").first().getAttribute("src"));
  assert.equal(src.origin, "https://www.youtube-nocookie.com");
  assert.equal(src.pathname, "/embed/aaaaaaaaaa1");
  for (const [key, value] of Object.entries({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: "aaaaaaaaaa1",
    controls: "0",
    playsinline: "1",
  }))
    assert.equal(src.searchParams.get(key), value, key);
  const box = await row.locator(".dive-video-frame").first().boundingBox();
  assert.ok(Math.abs(box.height / box.width - 16 / 9) < 0.02, "9:16 frame");
  assert.equal(
    await row.locator(".dive-video-caption span").first().textContent(),
    "Manta ray",
  );
  assert.equal(
    await row.locator(".dive-video-caption a").nth(1).getAttribute("href"),
    "https://youtu.be/bbbbbbbbbb2",
  );
  // Out of view the videos pause; back in view they play again.
  const playerFrame = await (
    await row.locator("iframe").first().elementHandle()
  ).contentFrame();
  const commands = () => playerFrame.evaluate(() => window.commands.join(","));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  assert.match(await commands(), /pauseVideo$/);
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  assert.match(await commands(), /playVideo$/);
  await page.goto(base + "/id", { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".dive-video-caption span").first().textContent(),
    "Manta",
  );

  // Phone: swipeable row, no sideways page scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: "networkidle" });
  await row.scrollIntoViewIfNeeded();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const phone = await row.locator(".dive-video-frame").first().boundingBox();
  assert.ok(phone.width > 230 && phone.width < 270, "about 64vw on phones");

  // Reduced motion: nothing plays until the visitor taps a video.
  const calm = await open({ reducedMotion: "reduce" });
  await calm.page.goto(base, { waitUntil: "networkidle" });
  const calmRow = calm.page.locator(".dive-videos");
  await calmRow.scrollIntoViewIfNeeded();
  await calm.page.waitForTimeout(500);
  assert.equal(await calmRow.locator("iframe").count(), 0);
  await calm.page.getByRole("button", { name: "Play Manta ray" }).click();
  const tapped = new URL(
    await calmRow.locator("iframe").first().getAttribute("src"),
  );
  assert.equal(tapped.searchParams.get("controls"), "1");
  assert.deepEqual(calm.page.errors, []);
  await calm.context.close();

  // Without IntersectionObserver the players simply load straight away.
  const plain = await open();
  await plain.context.addInitScript(() => {
    window.IntersectionObserver = undefined;
  });
  await plain.page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await plain.page.locator(".dive-videos iframe").count(), 3);
  assert.ok(await plain.page.locator(".store-map").isVisible());
  assert.deepEqual(plain.page.errors, []);
  await plain.context.close();

  // Put the gallery back without videos.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Video YouTube (9:16)" }).waitFor();
  while ((await page.locator(".admin-video-item").count()) > 0)
    await page
      .locator("fieldset:has(.admin-video-item)")
      .first()
      .getByRole("button", { name: "Hapus" })
      .click();
  await page.getByRole("button", { name: "Simpan video" }).click();
  await page.getByText("Perubahan sudah tersimpan").waitFor();
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".dive-videos").count(), 0);
  assert.deepEqual(page.errors, []);
  console.log(
    "PASS videos: none by default, admin recognises YouTube links and rejects others, 9:16 row between the ocean cards and the gallery button, lazy players with muted loop, pause out of view and play back in view, captions in both languages, YouTube links, 390px without sideways scroll, tap to play with reduced motion, straight load without IntersectionObserver. Nothing fetched from YouTube.",
  );
} finally {
  await browser.close();
}
