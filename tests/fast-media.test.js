import test from "node:test";
import assert from "node:assert/strict";
import { photoSrcSet, mediaWidths, isMediaPath } from "../src/photography.js";
import { videoCover, videoSource } from "../src/gallery.js";
import { validateVideos } from "../src/cms-model.js";
import { parsePlayerMessage, playerRunning } from "../src/video-player.js";

const media = "/api/media/0f8fad5b-d9cb-469f-a165-70867728950e";

test("uploaded photos list their smaller copies; site photos keep theirs", () => {
  assert.deepEqual(mediaWidths, [480, 828, 1280, 1920]);
  assert.equal(
    photoSrcSet(media),
    `${media}?w=480 480w, ${media}?w=828 828w, ${media}?w=1280 1280w, ${media}?w=1920 1920w`,
  );
  assert.equal(isMediaPath(media + "?w=480"), false);
  assert.equal(photoSrcSet("https://example.com/foto.jpg"), undefined);
  assert.equal(photoSrcSet(""), undefined);
  assert.match(
    photoSrcSet("/assets/photos/banner-penyu.webp"),
    /banner-penyu-small\.webp 800w/,
  );
});

test("videos keep an optional cover picture of the owner's choice", () => {
  const [plain, covered] = validateVideos([
    { url: "https://www.instagram.com/reel/C9xYz_AbCdE/" },
    {
      url: "https://www.facebook.com/reel/1234567890123456",
      poster: ` ${media} `,
    },
  ]);
  assert.equal("poster" in plain, false);
  assert.equal(covered.poster, media);
  assert.throws(
    () =>
      validateVideos([
        { url: "https://youtu.be/aaaaaaaaaa1", poster: "javascript:alert(1)" },
      ]),
    /HTTPS/,
  );
});

test("each video has a cover while its player loads", () => {
  const tiktok =
    "https://www.tiktok.com/@zanclus.dive/video/7351234567890123456";
  assert.equal(
    videoCover({ url: tiktok }),
    "/api/video-poster/tiktok/7351234567890123456",
  );
  assert.equal(
    videoCover({ url: "https://youtu.be/aaaaaaaaaa1" }),
    "https://i.ytimg.com/vi/aaaaaaaaaa1/hqdefault.jpg",
  );
  assert.equal(
    videoCover({ url: "https://www.instagram.com/reel/C9xYz_AbCdE/" }),
    "",
  );
  // The owner's cover wins, also for product videos given as a source.
  assert.equal(videoCover({ url: tiktok, poster: media }), media);
  assert.equal(
    videoCover(null, videoSource(tiktok)),
    "/api/video-poster/tiktok/7351234567890123456",
  );
});

test("the cover goes once the player says the video plays", () => {
  const tt = (data) => playerRunning("tiktok", data);
  assert.equal(tt({ type: "onPlayerReady" }), false);
  assert.equal(tt({ type: "onStateChange", value: 3 }), false);
  assert.equal(tt({ type: "onStateChange", value: 1 }), true);
  assert.equal(
    tt({ type: "onCurrentTime", value: { currentTime: 0.4 } }),
    true,
  );
  assert.equal(tt({ type: "onCurrentTime", value: { currentTime: 0 } }), false);
  const yt = (text) => playerRunning("youtube", parsePlayerMessage(text));
  assert.equal(yt('{"event":"onStateChange","info":1}'), true);
  assert.equal(yt('{"event":"onStateChange","info":3}'), false);
  assert.equal(yt('{"event":"infoDelivery","info":{"currentTime":1.2}}'), true);
  assert.equal(yt("not json"), false);
  assert.equal(
    playerRunning("instagram", { type: "onStateChange", value: 1 }),
    false,
  );
});
