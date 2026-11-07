import test from "node:test";
import assert from "node:assert/strict";
import { youtubeId, videoLimit } from "../src/gallery.js";
import { validateGallery } from "../src/cms-model.js";

test("YouTube links of every common shape give the video ID", () => {
  for (const link of [
    "https://youtube.com/shorts/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    " dQw4w9WgXcQ ",
  ])
    assert.equal(youtubeId(link), "dQw4w9WgXcQ", link);
  for (const link of [
    "",
    "https://vimeo.com/123456",
    "https://youtube.com/@zanclus",
    "https://youtube.com/watch?v=short",
    "https://evil.example/shorts/dQw4w9WgXcQ",
    null,
  ])
    assert.equal(youtubeId(link), null, String(link));
});

test("gallery videos are optional, checked and limited", () => {
  const items = [];
  assert.deepEqual(validateGallery({ items }).videos, []);
  const saved = validateGallery({
    items,
    videos: [
      {
        url: " https://youtube.com/shorts/dQw4w9WgXcQ ",
        caption: { id: " Penyu ", en: "Turtle" },
      },
    ],
  });
  assert.deepEqual(saved.videos, [
    {
      url: "https://youtube.com/shorts/dQw4w9WgXcQ",
      caption: { id: "Penyu", en: "Turtle" },
    },
  ]);
  assert.throws(
    () => validateGallery({ items, videos: [{ url: "https://vimeo.com/1" }] }),
    /Link video 1 belum dikenali/,
  );
  const many = Array.from({ length: videoLimit + 1 }, () => ({
    url: "dQw4w9WgXcQ",
    caption: { id: "", en: "" },
  }));
  assert.throws(() => validateGallery({ items, videos: many }), /maksimal/);
});

test("TikTok, Instagram and Facebook links are recognised", async () => {
  const { videoSource } = await import("../src/gallery.js");
  const cases = [
    [
      "https://www.tiktok.com/@zanclus.dive/video/7351234567890123456?is_from_webapp=1",
      "tiktok",
      "7351234567890123456",
      "https://www.tiktok.com/@zanclus.dive/video/7351234567890123456",
    ],
    [
      "https://www.tiktok.com/embed/v2/7351234567890123456",
      "tiktok",
      "7351234567890123456",
      "https://www.tiktok.com/embed/v2/7351234567890123456",
    ],
    [
      "https://www.instagram.com/reel/C9xYz_AbCdE/?igsh=MWQ1",
      "instagram",
      "C9xYz_AbCdE",
      "https://www.instagram.com/reel/C9xYz_AbCdE/",
    ],
    [
      "instagram.com/zanclus/reel/C9xYz_AbCdE",
      "instagram",
      "C9xYz_AbCdE",
      "https://www.instagram.com/reel/C9xYz_AbCdE/",
    ],
    [
      "https://www.instagram.com/p/C9xYz_AbCdE/",
      "instagram",
      "C9xYz_AbCdE",
      "https://www.instagram.com/p/C9xYz_AbCdE/",
    ],
    [
      "https://www.facebook.com/reel/1234567890123456?mibextid=abc",
      "facebook",
      "1234567890123456",
      "https://www.facebook.com/reel/1234567890123456",
    ],
    [
      "https://m.facebook.com/watch/?v=1234567890",
      "facebook",
      "1234567890",
      "https://www.facebook.com/watch/?v=1234567890",
    ],
    [
      "https://web.facebook.com/ZanclusDive/videos/raja-ampat/987654321012345/",
      "facebook",
      "987654321012345",
      "https://www.facebook.com/ZanclusDive/videos/987654321012345/",
    ],
  ];
  for (const [link, platform, id, url] of cases)
    assert.deepEqual(videoSource(link), { platform, id, url }, link);
  for (const link of [
    "https://vt.tiktok.com/ZSabc123/",
    "https://vm.tiktok.com/ZMabc123/",
    "https://www.tiktok.com/t/ZTabc123/",
    "https://fb.watch/abcDEF/",
    "https://www.facebook.com/share/r/1AbCdEf/",
  ])
    assert.equal(videoSource(link).short, true, link);
  for (const link of [
    "https://www.tiktok.com/@zanclus",
    "https://www.instagram.com/zanclus/",
    "https://www.facebook.com/ZanclusDive",
    "https://evil.example/reel/1234567890123456",
    "javascript:alert(1)",
  ])
    assert.equal(videoSource(link), null, link);
});

test("share links are saved only once opened", () => {
  const items = [];
  const saved = validateGallery({
    items,
    videos: [
      { url: "https://www.tiktok.com/@a/video/7351234567890123456" },
      { url: "https://www.instagram.com/reel/C9xYz_AbCdE/" },
      { url: "https://www.facebook.com/reel/1234567890123456" },
    ],
  });
  assert.equal(saved.videos.length, 3);
  assert.throws(
    () =>
      validateGallery({ items, videos: [{ url: "https://vt.tiktok.com/x/" }] }),
    /Link video 1 masih link pendek/,
  );
});

test("TikTok and Facebook share links open to the video", async () => {
  const { expandVideoLink } = await import("../src/server/video-links.js");
  const hops = {
    "https://vt.tiktok.com/ZSabc123/":
      "https://www.tiktok.com/@zanclus/video/7351234567890123456?_r=1",
    "https://fb.watch/abcDEF/":
      "https://www.facebook.com/watch/?v=1234567890&ref=sharing",
    "https://www.facebook.com/share/r/1AbCdEf/":
      "https://www.facebook.com/reel/1234567890123456/?mibextid=x",
    "https://vt.tiktok.com/ZSevil/": "http://169.254.169.254/latest",
  };
  const asked = [];
  const fakeFetch = async (url) => {
    asked.push(String(url));
    const location = hops[String(url)];
    return {
      status: location ? 301 : 200,
      headers: { get: () => location ?? null },
      body: { cancel: async () => {} },
    };
  };
  assert.deepEqual(
    await expandVideoLink("https://vt.tiktok.com/ZSabc123/", fakeFetch),
    {
      platform: "tiktok",
      id: "7351234567890123456",
      url: "https://www.tiktok.com/@zanclus/video/7351234567890123456",
      link: "https://www.tiktok.com/@zanclus/video/7351234567890123456",
    },
  );
  assert.equal(
    (await expandVideoLink("https://fb.watch/abcDEF/", fakeFetch)).link,
    "https://www.facebook.com/watch/?v=1234567890",
  );
  assert.equal(
    (
      await expandVideoLink(
        "https://www.facebook.com/share/r/1AbCdEf/",
        fakeFetch,
      )
    ).link,
    "https://www.facebook.com/reel/1234567890123456",
  );
  // Redirects off TikTok and Facebook are not followed.
  asked.length = 0;
  assert.equal(
    (await expandVideoLink("https://vt.tiktok.com/ZSevil/", fakeFetch)).short,
    true,
  );
  assert.deepEqual(asked, ["https://vt.tiktok.com/ZSevil/"]);
  // An unreachable site leaves the share link unopened.
  const offline = await expandVideoLink(
    "https://fb.watch/abcDEF/",
    async () => {
      throw new TypeError("fetch failed");
    },
  );
  assert.equal(offline.short, true);
  // Full links need no request.
  asked.length = 0;
  await expandVideoLink(
    "https://www.instagram.com/reel/C9xYz_AbCdE/",
    fakeFetch,
  );
  assert.deepEqual(asked, []);
});
