"use client";
import { useId, useRef, useState } from "react";
import ProductVisual from "./ProductVisual.jsx";
import { rupiah } from "../shop-model.js";
import { dictionary, localeHref } from "../i18n.js";
import { rentalGroups, priceText } from "../price-list.js";

const tabs = ["buy", ...rentalGroups];
const visuals = {
  buy: "mask",
  rentalSets: "bcd",
  rentalBasics: "fins",
  rentalScuba: "regulator",
  rentalTank: "cylinder",
  rentalTools: "computer",
  rentalCamera: "camera",
};

// Small line icons for the service list.
function TabIcon({ name }) {
  const paths = {
    buy: "M5 8h14l-1.5 11h-11L5 8Zm4 0V6a3 3 0 0 1 6 0v2",
    rentalSets: "M4 9h16v10H4zM9 9V6h6v3M4 13h16",
    rentalBasics:
      "M3 9h18v3a3 3 0 0 1-3 3h-2l-2-2h-4l-2 2H6a3 3 0 0 1-3-3V9Zm16-4v6",
    rentalScuba:
      "M9 4h6l1 4v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8l1-4Zm-1 7h8M12 4V2",
    rentalTank: "M9 6h6v14H9zM10 6V4h4v2M12 2v2",
    rentalTools: "M7 4h10v16H7zM10 8h4M12 12v4",
    rentalCamera: "M4 8h4l2-3h4l2 3h4v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Homepage Dive Shop: a list of services on the left and the selected
// service's prices on the right. Buying uses the CMS catalog; rentals use
// the price list.
export default function ShopTeaser({
  shop,
  priceList,
  whatsapp,
  demo,
  locale = "en",
}) {
  const t = dictionary(locale).shop;
  const s = t.teaser;
  const [active, setActive] = useState("buy");
  const id = useId();
  const tabRefs = useRef({});
  const [title, text] = s.groups[active];
  const buying = active === "buy";
  const rows = buying
    ? shop.products
        .filter((p) => p.enabled && p.saleEnabled)
        .slice(0, 6)
        .map((p) => ({
          name: p.name,
          info: p.specification,
          price:
            p.salePrice === null
              ? dictionary(locale).common.requestQuote
              : rupiah(p.salePrice, locale),
          unit: "",
        }))
    : priceList[active].map((item) => ({
        name: priceText(item.name, locale),
        info: priceText(item.info, locale),
        price: rupiah(item.price, locale),
        unit: priceText(item.unit, locale),
      }));
  function onKeyDown(event) {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
      event.key
    ];
    if (!step) return;
    event.preventDefault();
    const next =
      tabs[(tabs.indexOf(active) + step + tabs.length) % tabs.length];
    setActive(next);
    tabRefs.current[next]?.focus();
  }
  return (
    <section
      className="shop-teaser"
      id="dive-shop"
      aria-labelledby="shop-teaser-title"
    >
      <div className="shop-teaser-heading" data-reveal>
        <div>
          <p className="eyebrow">ZANCLUS DIVE SHOP</p>
          <h2 id="shop-teaser-title">{shop.heading}</h2>
        </div>
        <div>
          <p>{shop.description}</p>
          <a className="button dark" href={localeHref(locale, "/dive-shop")}>
            {t.explore}
          </a>
        </div>
      </div>
      <div className="shop-services" data-reveal>
        <div
          className="shop-service-tabs"
          role="tablist"
          aria-label={s.tabsLabel}
          aria-orientation="vertical"
        >
          {tabs.map((key) => (
            <button
              type="button"
              role="tab"
              key={key}
              id={`${id}-tab-${key}`}
              ref={(el) => (tabRefs.current[key] = el)}
              aria-selected={active === key}
              aria-controls={`${id}-panel`}
              tabIndex={active === key ? 0 : -1}
              onClick={() => setActive(key)}
              onKeyDown={onKeyDown}
            >
              <TabIcon name={key} />
              <span>{s.groups[key][0]}</span>
            </button>
          ))}
        </div>
        <div
          className="shop-service-panel"
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${active}`}
        >
          <h3>{title}</h3>
          <p className="shop-service-text">{text}</p>
          <div className="shop-service-card">
            <ProductVisual product={{ category: visuals[active], image: "" }} />
            <div className="shop-service-body">
              <p className="shop-service-tag">
                {buying ? s.buyTag : s.rentalTag}
              </p>
              {rows.length ? (
                <ul className="shop-service-list">
                  {rows.map((row, index) => (
                    <li key={index}>
                      <span>
                        <strong>{row.name}</strong>
                        {row.info && <small>{row.info}</small>}
                      </span>
                      <span className="shop-service-price">
                        {row.price}
                        {row.unit && <small>{row.unit}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="shop-empty">{t.teaserEmpty}</p>
              )}
              <div className="shop-service-actions">
                <a
                  className="button dark"
                  href={localeHref(
                    locale,
                    `/dive-shop?mode=${buying ? "sale" : "rental"}#catalog`,
                  )}
                >
                  {buying ? s.shopBuy : s.shopRent}{" "}
                  <span aria-hidden="true">↗</span>
                </a>
                <a
                  className="shop-service-ask"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(s.whatsapp(title))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.ask} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="shop-teaser-bottom">
        <p>{s.note}</p>
        {demo && <small>{t.teaserDemo}</small>}
      </div>
    </section>
  );
}
