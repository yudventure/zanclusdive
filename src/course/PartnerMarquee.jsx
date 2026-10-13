import { defaultCourses, courseText } from "../course-model.js";
import { dictionary } from "../i18n.js";

// Running strip of dive certification partners. The list is repeated so
// the loop is seamless; the copy is hidden from screen readers. Without an
// uploaded logo a partner shows as a text badge.
export default function PartnerMarquee({ partners, locale, tone = "light" }) {
  const c = dictionary(locale).course;
  const list = partners ?? defaultCourses.partners;
  if (!list.length) return null;
  // Short lists are repeated so the strip is always wider than the screen.
  const round = Array.from(
    { length: Math.max(1, Math.ceil(6 / list.length)) },
    () => list,
  ).flat();
  const items = (hidden) =>
    round.map((partner, index) => (
      <li key={index} aria-hidden={hidden || index >= list.length || undefined}>
        {partner.logo ? (
          <img
            src={partner.logo}
            alt={partner.name}
            height="34"
            loading="lazy"
          />
        ) : (
          <span className="partner-badge">{partner.name}</span>
        )}
        {courseText(partner.full, locale) && (
          <small>{courseText(partner.full, locale)}</small>
        )}
      </li>
    ));
  return (
    <div className={`partner-marquee partner-marquee-${tone}`}>
      <p className="partner-marquee-title">{c.partnersKicker}</p>
      <div className="partner-marquee-window">
        <ul className="partner-marquee-track" aria-label={c.partnersLabel}>
          {items(false)}
          {items(true)}
        </ul>
      </div>
    </div>
  );
}
