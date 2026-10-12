"use client";
import { useEffect, useId, useRef, useState } from "react";
import { dictionary } from "../i18n.js";
import { defaultGallery, galleryCaption } from "../gallery.js";

// The Zanclus dive gallery. It stays rolled up under the ocean cards until
// the visitor opens it; a photo opens larger in a lightbox.
export default function DiveGallery({ gallery, locale }) {
  const t = dictionary(locale).gallery;
  const items = (gallery ?? defaultGallery).items;
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const id = useId();
  const lightbox = useRef(null);
  const toggle = useRef(null);
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
  function close() {
    setOpen(false);
    toggle.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  const item = current === null ? null : items[current];
  return (
    <div className={`dive-gallery ${open ? "is-open" : ""}`}>
      <div className="dive-gallery-toggle">
        <button
          ref={toggle}
          type="button"
          className="button"
          aria-expanded={open}
          aria-controls={`${id}-gallery`}
          onClick={() => (open ? close() : setOpen(true))}
        >
          {open ? t.close : t.open}{" "}
          <span aria-hidden="true" className="dive-gallery-arrow">
            ↓
          </span>
        </button>
        <small>{t.count(items.length)}</small>
      </div>
      <div
        className="dive-gallery-roll"
        id={`${id}-gallery`}
        inert={!open}
        aria-hidden={!open}
      >
        <div className="dive-gallery-inner">
          <ul className="dive-gallery-grid">
            {items.map((photo, index) => (
              <li
                key={index}
                style={{ "--gallery-delay": `${Math.min(index, 11) * 45}ms` }}
              >
                <button
                  type="button"
                  onClick={() => show(index)}
                  aria-label={t.view(
                    galleryCaption(photo, locale) || index + 1,
                  )}
                >
                  <img
                    src={photo.src}
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
            ))}
          </ul>
        </div>
      </div>
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
            <img src={item.src} alt={galleryCaption(item, locale)} />
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
