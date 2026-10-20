import { dictionary } from "../i18n.js";

// Cog and wrench in a small porthole, for parts being updated.
function LockedArt() {
  return (
    <svg
      className="locked-art"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="60" cy="60" r="56" fill="#0d4b5c" />
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke="#0d6f73"
        strokeWidth="6"
      />
      <circle
        cx="52"
        cy="62"
        r="18"
        fill="none"
        stroke="#bef4a5"
        strokeWidth="8"
        strokeDasharray="5.4 3.6"
      />
      <circle cx="52" cy="62" r="14" fill="#bef4a5" />
      <circle cx="52" cy="62" r="5.5" fill="#0d4b5c" />
      <g transform="rotate(40 74 60)">
        <rect x="70" y="52" width="9" height="46" rx="4.5" fill="#c4d0d4" />
        <circle cx="74.5" cy="48" r="11" fill="#c4d0d4" />
        <rect x="70.5" y="34" width="8" height="12" fill="#0d4b5c" />
      </g>
      <g fill="none" stroke="#ffffff80" strokeWidth="2">
        <circle cx="34" cy="30" r="4" />
        <circle cx="44" cy="20" r="2.5" />
      </g>
    </svg>
  );
}

// Placeholder for a homepage section that is locked in developer mode.
export function LockedSection({
  section,
  locale,
  whatsapp,
  id,
  as: Tag = "section",
}) {
  const t = dictionary(locale).locked;
  return (
    <Tag
      className="locked-section"
      id={id}
      data-locked={section}
      aria-labelledby={`locked-${section}`}
    >
      <div className="locked-card" data-reveal>
        <LockedArt />
        <div>
          <p className="locked-eyebrow">{t.eyebrow}</p>
          <h2 id={`locked-${section}`}>{t.sections[section]}</h2>
          <p>{t.text}</p>
          {whatsapp && (
            <a
              className="locked-chat"
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(t.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.chat} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </Tag>
  );
}

// Badge laid over a product, service or experience card that is locked.
export function LockedBadge({ locale }) {
  return (
    <span className="locked-badge">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {dictionary(locale).locked.item}
    </span>
  );
}
