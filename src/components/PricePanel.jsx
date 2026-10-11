import { dictionary, formatIDR, localeHref } from "../i18n.js";
import { priceText } from "../price-list.js";

// Package prices for one activity. Collapsed panels stay in the layout for
// the width animation but are inert, so they are skipped by keyboard and
// screen readers.
export default function PricePanel({ priceList, group, locale, hidden }) {
  const t = dictionary(locale);
  const p = t.prices;
  const label = t.activityLabels[group];
  return (
    <div className="price-card" inert={hidden} aria-hidden={hidden}>
      <div className="price-inner">
        <div className="price-body">
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
    </div>
  );
}
