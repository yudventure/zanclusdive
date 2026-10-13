"use client";
import { useRef } from "react";
import { calendarText, eventDates } from "../calendar-model.js";
import { dictionary } from "../i18n.js";

function Banner({ banner, whatsapp, locale }) {
  const t = dictionary(locale).home.eventBanner;
  const flyer = useRef(null);
  const text = (value) => calendarText(value, locale);
  const title = text(banner.title);
  const dates = eventDates(banner.startDate, banner.endDate, locale);
  const href =
    banner.link ||
    `https://wa.me/${whatsapp}?text=${encodeURIComponent(t.message(title, dates))}`;
  const external = !banner.link || banner.link.startsWith("https://");
  const open = () => flyer.current?.showModal();
  return (
    <aside className="event-banner" aria-label={`${t.label}: ${title}`}>
      <svg
        className="event-banner-sea"
        viewBox="0 0 600 160"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 118c60-14 110 10 170-2s110-30 170-14 110 26 170 10 60-14 90-10v58H0z"
          fill="#ffffff10"
        />
        <path
          d="M0 136c70-10 120 8 190-2s120-22 190-8 120 18 170 6 40-6 50-4v32H0z"
          fill="#ffffff0d"
        />
        <path
          d="M430 46c22-14 46-16 68-6 10-12 24-16 36-10-10 4-16 12-18 22 14 4 26 12 34 24-20-4-38-2-54 6-14 6-30 6-44-2-8 8-18 12-30 12 6-8 8-16 6-24-4-8 0-16 2-22z"
          fill="#ffffff14"
        />
      </svg>
      {banner.image ? (
        <button
          type="button"
          className="event-banner-photo"
          onClick={open}
          aria-label={`${t.flyer}: ${title}`}
        >
          <img src={banner.image} alt="" loading="lazy" />
        </button>
      ) : (
        <span className="event-banner-photo is-empty" aria-hidden="true" />
      )}
      <div className="event-banner-text">
        <p className="event-banner-meta">
          {text(banner.badge) && (
            <span className="event-banner-badge">{text(banner.badge)}</span>
          )}
          {dates && <span className="event-banner-dates">{dates}</span>}
        </p>
        <h3>{title}</h3>
        {text(banner.subtitle) && <p>{text(banner.subtitle)}</p>}
      </div>
      <div className="event-banner-offer">
        {(text(banner.price) || text(banner.note)) && (
          <p className="event-banner-price">
            {text(banner.price) && <strong>{text(banner.price)}</strong>}
            {text(banner.note) && <small>{text(banner.note)}</small>}
          </p>
        )}
        <div className="event-banner-actions">
          <a
            className="button lime small"
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {banner.link ? t.more : t.book} <span aria-hidden="true">↗</span>
          </a>
          {banner.image && (
            <button type="button" className="event-banner-flyer" onClick={open}>
              {t.flyer}
            </button>
          )}
        </div>
      </div>
      {banner.image && (
        <dialog
          ref={flyer}
          className="modal event-flyer"
          aria-label={t.flyerAlt(title)}
        >
          <button
            type="button"
            className="close-modal"
            aria-label={t.close}
            onClick={() => flyer.current?.close()}
          >
            ×
          </button>
          <img src={banner.image} alt={t.flyerAlt(title)} />
          <a
            className="button lime"
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {banner.link ? t.more : t.book} <span aria-hidden="true">↗</span>
          </a>
        </dialog>
      )}
    </aside>
  );
}

// Event banners above the experience cards; nothing when no event is on.
export default function EventBanners({ banners, whatsapp, locale }) {
  if (!banners?.length) return null;
  return (
    <div className="event-banners" data-reveal>
      {banners.map((banner, index) => (
        <Banner
          key={index}
          banner={banner}
          whatsapp={whatsapp}
          locale={locale}
        />
      ))}
    </div>
  );
}
