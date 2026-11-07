"use client";
import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import { dictionary } from "../i18n.js";
import {
  galleryCaption,
  videoCover,
  videoPlatforms,
  videoSource,
} from "../gallery.js";
import ContactIcon from "./ContactIcon.jsx";
import { parsePlayerMessage, playerRunning } from "../video-player.js";

const youtubeOrigin = "https://www.youtube-nocookie.com";
const tiktokOrigin = "https://www.tiktok.com";

// The player address for each platform. YouTube and TikTok play muted on a
// loop without controls until tapped; Instagram and Facebook use their own
// players, which the visitor taps (Instagram does not autoplay embeds).
function playerSrc(source, { tapped, still, width }) {
  const { platform, id, url } = source;
  if (platform === "youtube")
    return (
      `${youtubeOrigin}/embed/${id}?` +
      new URLSearchParams({
        autoplay: "1",
        mute: "1",
        loop: "1",
        playlist: id,
        controls: tapped ? "1" : "0",
        playsinline: "1",
        rel: "0",
        modestbranding: "1",
        iv_load_policy: "3",
        disablekb: "1",
        enablejsapi: "1",
        origin: window.location.origin,
      })
    );
  if (platform === "tiktok") {
    const shown = tapped ? "1" : "0";
    return (
      `${tiktokOrigin}/player/v1/${id}?` +
      new URLSearchParams({
        autoplay: "1",
        loop: "1",
        controls: shown,
        progress_bar: shown,
        play_button: shown,
        volume_control: shown,
        fullscreen_button: "0",
        timestamp: "0",
        music_info: "0",
        description: "0",
        rel: "0",
        native_context_menu: "0",
        closed_caption: "0",
      })
    );
  }
  if (platform === "instagram") return `${url}embed/`;
  return (
    "https://www.facebook.com/plugins/video.php?" +
    new URLSearchParams({
      href: url,
      show_text: "false",
      autoplay: still ? "false" : "true",
      mute: "true",
      allowfullscreen: "true",
      width: String(width),
      height: String(Math.round((width * 16) / 9)),
    })
  );
}

// One 9:16 video. Its cover shows at once; the player loads a screen ahead
// of the row, after the page itself, and the cover fades out only once
// the video really plays, so no black frame shows while it loads.
// YouTube and TikTok play muted on a loop and pause again once they scroll
// away. With reduced motion they wait for a tap instead.
export function Video({ source, cover, name, caption, t }) {
  const box = useRef(null);
  const frame = useRef(null);
  const [active, setActive] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [still, setStill] = useState(false);
  const [width, setWidth] = useState(270);
  const [playing, setPlaying] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  // Instagram and Facebook are always played by tapping their own player.
  const own = ["instagram", "facebook"].includes(source.platform);
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(calm);
    setWidth(Math.round(box.current?.clientWidth || 270));
    const send = (play) => {
      const target = frame.current?.contentWindow;
      if (!target) return;
      if (source.platform === "youtube")
        target.postMessage(
          JSON.stringify({
            event: "command",
            func: play ? "playVideo" : "pauseVideo",
            args: [],
          }),
          youtubeOrigin,
        );
      else if (source.platform === "tiktok")
        target.postMessage(
          { "x-tiktok-player": true, type: play ? "play" : "pause" },
          tiktokOrigin,
        );
    };
    // TikTok starts muted once its player says it is ready. Either player
    // saying it plays takes the cover away.
    const ready = (event) => {
      if (
        !frame.current ||
        event.source !== frame.current.contentWindow ||
        ![tiktokOrigin, youtubeOrigin].includes(event.origin)
      )
        return;
      const data = parsePlayerMessage(event.data);
      if (playerRunning(source.platform, data)) setPlaying(true);
      if (source.platform !== "tiktok" || data?.type !== "onPlayerReady")
        return;
      event.source.postMessage(
        { "x-tiktok-player": true, type: "mute" },
        tiktokOrigin,
      );
      // A player loaded ahead of the row waits until it is in view.
      event.source.postMessage(
        { "x-tiktok-player": true, type: inView ? "play" : "pause" },
        tiktokOrigin,
      );
    };
    // Without IntersectionObserver every player counts as in view.
    let inView = typeof window.IntersectionObserver !== "function";
    window.addEventListener("message", ready);
    if (typeof window.IntersectionObserver !== "function") {
      if (!calm || own) setActive(true);
      return () => window.removeEventListener("message", ready);
    }
    // Players start a screen before the row reaches the screen, once the
    // page's own photos have loaded; they play only when in view.
    let observer = null;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!calm || own)) setActive(true);
      },
      { rootMargin: "100% 0px" },
    );
    const watch = () => {
      near.observe(box.current);
      observer = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          if (!entry.isIntersecting) return send(false);
          if (!calm || own) setActive(true);
          send(true);
        },
        { rootMargin: "0px" },
      );
      observer.observe(box.current);
    };
    if (document.readyState === "complete") watch();
    else window.addEventListener("load", watch, { once: true });
    return () => {
      near.disconnect();
      observer?.disconnect();
      window.removeEventListener("load", watch);
      window.removeEventListener("message", ready);
    };
  }, [source.platform, own]);
  // Once the player page is in, YouTube is asked to report its state, and
  // the cover goes after a while even without word from the player.
  function loaded() {
    const target = frame.current?.contentWindow;
    if (source.platform === "youtube" && target)
      target.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        youtubeOrigin,
      );
    setTimeout(() => setPlaying(true), own ? 400 : 8000);
  }
  const platform = videoPlatforms[source.platform];
  return (
    <li className="dive-video" ref={box} data-platform={source.platform}>
      <div
        className={
          "dive-video-frame" +
          (tapped ? " is-tapped" : "") +
          (own ? " is-own-player" : "") +
          (playing ? " is-playing" : "")
        }
      >
        {active && (
          <iframe
            ref={frame}
            src={playerSrc(source, { tapped, still, width })}
            title={name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
            scrolling="no"
            tabIndex={tapped || own ? 0 : -1}
            onLoad={loaded}
          />
        )}
        {cover && !coverFailed ? (
          <img
            className="dive-video-cover"
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            width="540"
            height="960"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <span
            className="dive-video-poster dive-video-cover"
            aria-hidden="true"
          >
            <ContactIcon name={source.platform} />
          </span>
        )}
        {still && !active && (
          <button
            type="button"
            className="dive-video-play"
            aria-label={t.play(name)}
            onClick={() => {
              setTapped(true);
              setActive(true);
            }}
          >
            <span aria-hidden="true">▶</span>
          </button>
        )}
        <div className="dive-video-caption">
          {caption && <span>{caption}</span>}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.watch(name, platform)}
            title={platform}
          >
            <ContactIcon name={source.platform} />
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </li>
  );
}

// Row of vertical videos between the ocean cards and the gallery.
export default function DiveVideos({ videos, locale }) {
  const t = dictionary(locale).gallery;
  const list = (videos ?? [])
    .map((video) => ({
      caption: { id: "", en: "" },
      ...video,
      source: videoSource(video.url),
    }))
    .filter((video) => video.source && !video.source.short);
  if (!list.length) return null;
  // The players' sites are greeted while the page loads.
  if (list.some((video) => video.source.platform === "tiktok"))
    preconnect(tiktokOrigin);
  if (list.some((video) => video.source.platform === "youtube")) {
    preconnect(youtubeOrigin);
    preconnect("https://i.ytimg.com");
  }
  return (
    <ul className="dive-videos" aria-label={t.videos} data-reveal>
      {list.map((video, index) => {
        const caption = galleryCaption(video, locale);
        return (
          <Video
            key={video.source.platform + video.source.id + index}
            source={video.source}
            cover={videoCover(video, video.source)}
            caption={caption}
            name={t.video(index + 1, caption)}
            t={t}
          />
        );
      })}
    </ul>
  );
}
