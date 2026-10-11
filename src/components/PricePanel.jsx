import { dictionary, formatIDR, localeHref } from "../i18n.js";
import { priceText } from "../price-list.js";

// Package prices for the activity in view. `group` follows the card under
// the pointer; the tabs work for touch and keyboard users.
export default function PricePanel({
  priceList,
  group,
  groups,
  onSelect,
  locale,
}) {
  const t = dictionary(locale);
  const p = t.prices;
  const label = t.activityLabels[group];
  return (
    <div className="calendar-card price-card" id="prices">
      <div className="price-tabs" role="group" aria-label={p.tabs}>
        {groups.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === group}
            onClick={() => onSelect(key)}
          >
            {t.activityLabels[key]}
          </button>
        ))}
      </div>
      <div className="price-body" aria-live="polite">
        <p className="price-kicker">{p.kicker}</p>
        <h3>{p.title(label)}</h3>
        <ul className="price-list">
          {priceList[group].map((item, index) => (
            <li key={index}>
              <span>
                <strong>{priceText(item.name, locale)}</strong>
                {priceText(item.info, locale) && (
                  <small>{priceText(item.info, locale)}</small>
                )}
              </span>
              <span className="price-amount">
                {formatIDR(item.price, locale)}
                {priceText(item.unit, locale) && (
                  <small>{priceText(item.unit, locale)}</small>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <a
        className="button dark price-cta"
        href={localeHref(locale, `/${group}#inquiry`)}
      >
        {p.cta(label)} <span aria-hidden="true">↗</span>
      </a>
      <small className="price-note">{p.note}</small>
    </div>
  );
}
