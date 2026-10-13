import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { demoAccount } from "../src/demo-data.js";

// Videos above the gallery button from YouTube, TikTok, Instagram and
// Facebook. Run against a local demo server with demo login:
// CMS_MODE=demo CMS_DEMO_LOGIN=true npm start
// The players are replaced by stand-ins, so nothing is fetched from them.
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
// TikTok's player says it is ready, then records what the page asks.
const tiktokPlayer = `<!doctype html><body style="margin:0;height:100vh;background:#111;color:#fff;display:grid;place-items:center">tiktok<script>
window.messages = [];
addEventListener("message", (e) => messages.push(e.data.type));
parent.postMessage({ "x-tiktok-player": true, type: "onPlayerReady" }, "*");
</script>`;
const stand = (label) =>
  `<!doctype html><body style="margin:0;height:100vh;background:#fff;display:grid;place-items:center">${label}</body>`;
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
  await context.route("https://www.tiktok.com/**", (r) =>
    r.fulfill({ contentType: "text/html", body: tiktokPlayer }),
  );
  await context.route("https://www.instagram.com/**", (r) =>
    r.fulfill({ contentType: "text/html", body: stand("instagram") }),
  );
  await context.route("https://www.facebook.com/**", (r) =>
    r.fulfill({ contentType: "text/html", body: stand("facebook") }),
  );
  const tab = await context.newPage();
  tab.errors = [];
  tab.on("pageerror", (error) => tab.errors.push(error.message));
  return { context, page: tab };
}
const tiktok = "7351234567890123456";
const links = [
  "https://youtube.com/shorts/aaaaaaaaaa1?si=share",
  `https://www.tiktok.com/@zanclus.dive/video/${tiktok}?is_from_webapp=1`,
  "https://www.instagram.com/reel/C9xYz_AbCdE/?igsh=MWQ1",
  "https://www.facebook.com/reel/1234567890123456?mibextid=abc",
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
  await page.getByRole("heading", { name: "Video vertikal (9:16)" }).waitFor();
  const add = page.getByRole("button", { name: "+ Tambah video" });
  await add.click();
  const fields = page.getByLabel("Link video");
  const status = page.locator(".admin-video-status");
  await fields.nth(0).fill("https://vimeo.com/12345");
  await page.getByText("Link belum dikenali.").waitFor();
  await page.getByRole("button", { name: "Simpan video" }).click();
  await page.getByText("Link video 1 belum dikenali").waitFor();
  // A share link the server cannot open says what to do instead (this
  // sandbox has no internet, so the opening fails).
  await fields.nth(0).fill("https://vt.tiktok.com/ZSabc123/");
  await page
    .getByText("Link pendek belum bisa dibuka dari server.", { exact: false })
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Simpan video" }).click();
  await page.getByText("Link video 1 masih link pendek").waitFor();
  for (let i = 1; i < links.length; i++) await add.click();
  for (const [index, link] of links.entries())
    await fields.nth(index).fill(link);
  for (const [index, platform] of [
    "YouTube",
    "TikTok",
    "Instagram",
    "Facebook",
    "YouTube",
    "YouTube",
  ].entries())
    assert.match(
      await status.nth(index).textContent(),
      new RegExp(`^Link ${platform} dikenali\\.`),
    );
  assert.match(await status.nth(2).textContent(), /mengetuk untuk memutar/);
  assert.equal(
    await page.locator(".admin-video-preview .admin-video-platform").count(),
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
  assert.equal(await row.locator(".dive-video").count(), 6);
  assert.equal(await row.locator("iframe").count(), 0, "players load lazily");
  const top = async (selector) =>
    (await page.locator(selector).boundingBox()).y;
  assert.ok((await top(".ocean-grid")) < (await top(".dive-videos")));
  assert.ok((await top(".dive-videos")) < (await top(".dive-gallery-toggle")));
  await row.scrollIntoViewIfNeeded();
  await row.locator("iframe").nth(3).waitFor();
  // The last videos load once the row is swiped to them.
  await row.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await row.locator("iframe").nth(5).waitFor();
  await row.evaluate((el) => (el.scrollLeft = 0));
  const frameOf = (platform) =>
    row.locator(`.dive-video[data-platform="${platform}"] iframe`).first();
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
  // TikTok: its own player, muted on a loop without controls.
  const tik = new URL(await frameOf("tiktok").getAttribute("src"));
  assert.equal(
    tik.origin + tik.pathname,
    `https://www.tiktok.com/player/v1/${tiktok}`,
  );
  for (const [key, value] of Object.entries({
    autoplay: "1",
    loop: "1",
    controls: "0",
    progress_bar: "0",
    music_info: "0",
    description: "0",
  }))
    assert.equal(tik.searchParams.get(key), value, "tiktok " + key);
  // Instagram and Facebook: their own players, played by tapping them.
  assert.equal(
    await frameOf("instagram").getAttribute("src"),
    "https://www.instagram.com/reel/C9xYz_AbCdE/embed/",
  );
  const fb = new URL(await frameOf("facebook").getAttribute("src"));
  assert.equal(
    fb.origin + fb.pathname,
    "https://www.facebook.com/plugins/video.php",
  );
  assert.equal(
    fb.searchParams.get("href"),
    "https://www.facebook.com/reel/1234567890123456",
  );
  assert.equal(fb.searchParams.get("autoplay"), "true");
  assert.equal(fb.searchParams.get("show_text"), "false");
  for (const platform of ["instagram", "facebook"]) {
    assert.equal(
      await row
        .locator(`.dive-video[data-platform="${platform}"] .dive-video-frame`)
        .evaluate((el) => el.classList.contains("is-own-player")),
      true,
    );
    assert.equal(
      await frameOf(platform).evaluate(
        (el) => getComputedStyle(el).pointerEvents,
      ),
      "auto",
    );
  }
  for (const frame of await row.locator(".dive-video-frame").all()) {
    const box = await frame.boundingBox();
    assert.ok(Math.abs(box.height / box.width - 16 / 9) < 0.02, "9:16 frame");
  }
  assert.equal(
    await row.locator(".dive-video-caption span").first().textContent(),
    "Manta ray",
  );
  const watch = row.locator(".dive-video-caption a");
  for (const [index, href] of [
    "https://youtu.be/aaaaaaaaaa1",
    `https://www.tiktok.com/@zanclus.dive/video/${tiktok}`,
    "https://www.instagram.com/reel/C9xYz_AbCdE/",
    "https://www.facebook.com/reel/1234567890123456",
    "https://youtu.be/bbbbbbbbbb2",
  ].entries())
    assert.equal(await watch.nth(index).getAttribute("href"), href);
  assert.match(await watch.nth(1).getAttribute("aria-label"), /on TikTok$/);
  assert.equal(await watch.nth(1).locator("svg").count(), 1);
  // Out of view the videos pause; back in view they play again.
  const playerFrame = await (
    await row.locator("iframe").first().elementHandle()
  ).contentFrame();
  const commands = () => playerFrame.evaluate(() => window.commands.join(","));
  const tikFrame = await (
    await frameOf("tiktok").elementHandle()
  ).contentFrame();
  const tikMessages = () => tikFrame.evaluate(() => window.messages.join(","));
  await page.waitForTimeout(500);
  assert.match(await tikMessages(), /^mute,play/, "TikTok starts muted");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  assert.match(await commands(), /pauseVideo$/);
  assert.match(await tikMessages(), /pause$/);
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  assert.match(await commands(), /playVideo$/);
  assert.match(await tikMessages(), /play$/);
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
  // Only Instagram and Facebook, which wait for a tap anyway, load.
  assert.equal(await calmRow.locator("iframe").count(), 2);
  assert.equal(
    new URL(
      await calmRow
        .locator('.dive-video[data-platform="facebook"] iframe')
        .getAttribute("src"),
    ).searchParams.get("autoplay"),
    "false",
  );
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
  assert.equal(await plain.page.locator(".dive-videos iframe").count(), 6);
  assert.ok(await plain.page.locator(".store-map").isVisible());
  assert.deepEqual(plain.page.errors, []);
  await plain.context.close();

  // Put the gallery back without videos.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(base + "/admin/media", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Video vertikal (9:16)" }).waitFor();
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
    "PASS videos: none by default, admin recognises YouTube, TikTok, Instagram and Facebook links and rejects others, share links that cannot be opened explain what to do and are not saved, 9:16 row between the ocean cards and the gallery button, lazy players (YouTube and TikTok muted on a loop, Instagram and Facebook in their own tappable players), more videos load when swiped to, pause out of view and play back in view for YouTube and TikTok, links to each platform, captions in both languages, YouTube links, 390px without sideways scroll, tap to play with reduced motion, straight load without IntersectionObserver. Nothing fetched from the platforms.",
  );
} finally {
  await browser.close();
}
