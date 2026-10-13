"use client";
import { useEffect, useRef, useState } from "react";
import { dictionary } from "../i18n.js";
import { galleryCaption, youtubeId } from "../gallery.js";

const embedOrigin = "https://www.youtube-nocookie.com";

// One 9:16 video. The YouTube player loads only when the frame comes near
// the screen, then plays muted on a loop and pauses again once it scrolls
// away. With reduced motion it waits for a tap instead.
function Video({ id, name, caption, t }) {
  const box = useRef(null);
  const frame = useRef(null);
  const [active, setActive] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(calm);
    const command = (func) =>
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args: [] }),
        embedOrigin,
      );
    if (typeof window.IntersectionObserver !== "function") {
      if (!calm) setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return command("pauseVideo");
        if (!calm) setActive(true);
        command("playVideo");
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  const src = () =>
    `${embedOrigin}/embed/${id}?` +
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
    });
  return (
    <li className="dive-video" ref={box}>
      <div className={`dive-video-frame ${tapped ? "is-tapped" : ""}`}>
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          width="480"
          height="360"
        />
        {active && (
          <iframe
            ref={frame}
            src={src()}
            title={name}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={tapped ? 0 : -1}
          />
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
            href={`https://youtu.be/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.watch(name)}
          >
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </li>
  );
}

// Row of vertical YouTube videos between the ocean cards and the gallery.
export default function DiveVideos({ videos, locale }) {
  const t = dictionary(locale).gallery;
  const list = (videos ?? [])
    .map((video) => ({
      caption: { id: "", en: "" },
      ...video,
      id: youtubeId(video.url),
    }))
    .filter((video) => video.id);
  if (!list.length) return null;
  return (
    <ul className="dive-videos" aria-label={t.videos} data-reveal>
      {list.map((video, index) => {
        const caption = galleryCaption(video, locale);
        return (
          <Video
            key={video.id + index}
            id={video.id}
            caption={caption}
            name={t.video(index + 1, caption)}
            t={t}
          />
        );
      })}
    </ul>
  );
}
