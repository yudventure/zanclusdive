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
