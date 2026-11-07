"use client";
import { useEffect, useId, useRef, useState } from "react";
import { dictionary } from "../i18n.js";
import { defaultGallery, galleryCaption } from "../gallery.js";
import { photoSrcSet } from "../photography.js";

// The Zanclus dive gallery under the ocean cards, open on laptops and
// tablets. A phone shows the first photos as small tiles and more with a
// button; any photo opens larger in a lightbox.
const phoneStep = 6;
// The mosaic repeats every 12 photos on laptops (four to a row) and every
// 6 on tablets and phones (three to a row). Photos after the last whole
// round share their rows evenly, so the gallery never ends with a gap: a
// photo alone takes the whole row, two take half each.
function rest(index, count, round, perRow, columns) {
  const start = count - (count % round);
  if (index < start) return null;
  const rowStart = start + Math.floor((index - start) / perRow) * perRow;
  return columns / Math.min(perRow, count - rowStart);
}
export default function DiveGallery({ gallery, locale }) {
  const t = dictionary(locale).gallery;
  const items = (gallery ?? defaultGallery).items;
  const [shown, setShown] = useState(phoneStep);
  const [current, setCurrent] = useState(null);
  const id = useId();
  const lightbox = useRef(null);
  useEffect(() => {
    if (current === null) return;
    const key = (event) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!items.length) return null;
  function show(index) {
    setCurrent(index);
    lightbox.current?.showModal();
  }
  function step(delta) {
    setCurrent((i) => (i + delta + items.length) % items.length);
  }
  const item = current === null ? null : items[current];
  return (
    <div className="dive-gallery">
      <ul className="dive-gallery-grid" id={`${id}-gallery`}>
        {items.map((photo, index) => {
          const wide = rest(index, items.length, 12, 4, 12);
          const narrow = rest(index, items.length, 6, 3, 6);
          return (
            <li
              key={index}
              className={
                [
                  index >= shown && "is-more",
                  wide && "is-rest-wide",
                  narrow && "is-rest-narrow",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              style={{
                "--wide": wide ?? undefined,
                "--narrow": narrow ?? undefined,
              }}
            >
              <button
                type="button"
                onClick={() => show(index)}
                aria-label={t.view(galleryCaption(photo, locale) || index + 1)}
              >
                <img
                  src={photo.src}
                  srcSet={photoSrcSet(photo.src)}
                  sizes="(max-width: 699px) 34vw, (max-width: 900px) 33vw, 25vw"
                  alt=""
                  loading="lazy"
                  width="900"
                  height="600"
                />
                {galleryCaption(photo, locale) && (
                  <span>{galleryCaption(photo, locale)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {shown < items.length && (
        <div className="dive-gallery-more">
          <button
            type="button"
            className="button"
            aria-controls={`${id}-gallery`}
            onClick={() => setShown((n) => n + phoneStep)}
          >
            {t.more}{" "}
            <span aria-hidden="true" className="dive-gallery-arrow">
              ↓
            </span>
          </button>
          <small>{t.shown(shown, items.length)}</small>
        </div>
      )}
      <dialog
        ref={lightbox}
        className="dive-lightbox"
        aria-label={t.lightbox}
        onClose={() => setCurrent(null)}
        onClick={(event) =>
          event.target === lightbox.current && lightbox.current.close()
        }
      >
        {item && (
          <figure>
            <img
              src={item.src}
              srcSet={photoSrcSet(item.src)}
              sizes="100vw"
              alt={galleryCaption(item, locale)}
            />
            <figcaption>
              <span>{galleryCaption(item, locale)}</span>
              <small>{t.position(current + 1, items.length)}</small>
            </figcaption>
          </figure>
        )}
        <button
          type="button"
          className="dive-lightbox-close"
          aria-label={t.closePhoto}
          onClick={() => lightbox.current?.close()}
        >
          ×
        </button>
        <button
          type="button"
          className="dive-lightbox-nav prev"
          aria-label={t.previous}
          onClick={() => step(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="dive-lightbox-nav next"
          aria-label={t.next}
          onClick={() => step(1)}
        >
          →
        </button>
      </dialog>
    </div>
  );
}
