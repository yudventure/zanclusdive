"use client";
import { useId, useRef, useState } from "react";
import ProductVisual from "./ProductVisual.jsx";
import ProductDetail from "./ProductDetail.jsx";
import DeliveryChoice, {
  firstDelivery,
  deliveryFee,
} from "../components/DeliveryChoice.jsx";
import {
  rupiah,
  unitsLeft,
  deliveryChoice,
  productAs,
  rentalTabs,
  rentalTabOf,
  pairOf,
} from "../shop-model.js";
import { dictionary, localeHref } from "../i18n.js";
import { addLine, cartTotals, checkoutMessage } from "./cart.js";
import FormField from "../components/FormField.jsx";
import PayPanel from "../components/PayPanel.jsx";
import FareChoice from "../components/FareChoice.jsx";
import { fareChoices, fareFor, fareMarkup } from "../fare-model.js";
import CartIcon from "../components/CartIcon.jsx";
import { filterItems, matchesSearch, sortOrders } from "./shop-filter.js";
import { LockedBadge } from "../components/Locked.jsx";
import { noLocks, itemLocked, pageLocked } from "../developer.js";

// The cart key of a product in one way and size.
const keyOf = (mode, productId, size = "") =>
  (mode === "sale" ? "buy:" : "rent:") + productId + (size ? ":" + size : "");

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Small line icons for the service list.
function TabIcon({ name }) {
  const paths = {
    buy: "M5 8h14l-1.5 11h-11L5 8Zm4 0V6a3 3 0 0 1 6 0v2",
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

// Pressure gauge, hose and cog for the gear service banner.
function ServiceArt() {
  return (
    <svg viewBox="0 0 140 140" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M62 100c0 24 26 30 42 18"
        stroke="#8fd3cf"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle
        cx="62"
        cy="60"
        r="40"
        fill="#0b3442"
        stroke="#bef4a5"
        strokeWidth="3"
      />
      <circle
        cx="62"
        cy="60"
        r="30"
        stroke="#ffffff55"
        strokeWidth="5"
        strokeDasharray="1.5 6.35"
      />
      <path
        d="M83 81a30 30 0 0 0 9-21"
        stroke="#ff9c8a"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M62 60 80 40"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="62" cy="60" r="5" fill="#bef4a5" />
      <circle
        cx="108"
        cy="106"
        r="15"
        stroke="#bef4a5"
        strokeWidth="7"
        strokeDasharray="4.7 3.15"
      />
      <circle cx="108" cy="106" r="11.5" fill="#bef4a5" />
      <circle cx="108" cy="106" r="4.5" fill="#0d6f73" />
      <circle cx="118" cy="30" r="5" stroke="#ffffff66" strokeWidth="2" />
      <circle cx="128" cy="14" r="3" stroke="#ffffff44" strokeWidth="2" />
      <circle cx="108" cy="12" r="2" fill="#ffffff44" />
    </svg>
  );
}

// Banner under the service list leading to the dive gear service page.
function ServiceBanner({ service, locale, locks }) {
  const b = dictionary(locale).shop.teaser.serviceBanner;
  const prices = (service?.items ?? [])
    .filter((item) => item.enabled && !itemLocked(locks, "service", item.id))
    .map((item) => item.price);
  if (pageLocked(locks, "service")) return null;
  return (
    <a className="shop-service-banner" href={localeHref(locale, "/service")}>
      <span className="shop-service-banner-top">
        <span className="shop-service-banner-eyebrow">{b.eyebrow}</span>
        <ServiceArt />
      </span>
      <strong>{b.title}</strong>
      <span className="shop-service-banner-text">{b.text}</span>
      <span className="shop-service-banner-meta">
        {prices.length > 0 && (
          <span>{b.from(rupiah(Math.min(...prices), locale))}</span>
        )}
        <span>{b.fast}</span>
      </span>
      <span className="shop-service-banner-cta">
        {b.cta} <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}

// Homepage Dive Shop: services on the left, the selected service's gear on
// the right as one card per item with its own price and cart button. The
// cart is checked out into a WhatsApp order.
export default function ShopTeaser({
  shop,
  service,
  whatsapp,
  locale = "en",
  locks = noLocks,
  payments,
  fares,
  stock = {},
}) {
  const t = dictionary(locale).shop;
  const s = t.teaser;
  const p = dictionary(locale).payment;
  const f = dictionary(locale).fare;
  const [active, setActive] = useState("buy");
  // Search and filters of the tab shown; the words stay across tabs.
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("default");
  const [available, setAvailable] = useState(false);
  function showTab(key) {
    setActive(key);
    setCategory("all");
  }
  // Standard, Comfort or Flexi for the rentals.
  const [fare, setFare] = useState("standard");
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    email: "",
    startDate: "",
    days: 1,
    notes: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  // The product window: { product, add } (add false from the checkout).
  const [detail, setDetail] = useState(null);
  // Picked up at the dive center or delivered: { method, zone, address }.
  const [delivery, setDelivery] = useState(() => firstDelivery(shop.delivery));
  const fee = deliveryFee(shop.delivery, delivery);
  const zoneName =
    shop.delivery?.zones.find((z) => z.id === delivery.zone)?.name ?? "";
  const id = useId();
  const tabRefs = useRef({});
  const dialog = useRef(null);
  // Dive Shop gear to buy, then the rental gear in tabs by kind, each tab
  // shown when it has gear.
  const renting = (p, tab) =>
    p.enabled && p.rentalEnabled && rentalTabOf[p.category] === tab;
  const tabs = [
    "buy",
    ...rentalTabs.filter((tab) => shop.products.some((p) => renting(p, tab))),
  ];
  const [title, text] = s.groups[active];
  const buying = active === "buy";
  const mode = buying ? "sale" : "rental";
  const inTab = (tab) =>
    shop.products.filter((p) =>
      tab === "buy" ? p.enabled && p.saleEnabled : renting(p, tab),
    );
  const categoryName = (key) => dictionary(locale).shopCategories[key] ?? key;
  const items = inTab(active).map((p) => ({
    key: keyOf(mode, p.id),
    name: p.name,
    info: p.specification,
    price: buying ? p.salePrice : p.rentalPrice,
    unit: buying ? "" : s.message.perDay,
    mode,
    // The photos of the units for sale, or of the units for rent.
    visual: productAs(p, mode),
    product: p,
    productId: p.id,
    size: "",
    locked: itemLocked(locks, "product", p.id),
    // Gear that follows the warehouse stops at the units left.
    left: unitsLeft(p, stock, mode) ?? 10,
  }));
  const categories = [...new Set(items.map((item) => item.product.category))];
  const shown = filterItems(
    items,
    { query, category, available, sort },
    { categoryName, locale },
  );
  const filtered =
    Boolean(query.trim()) ||
    category !== "all" ||
    available ||
    sort !== "default";
  function resetFilters() {
    setQuery("");
    setCategory("all");
    setAvailable(false);
    setSort("default");
  }
  // The other tabs that have gear for the words searched.
  const elsewhere = query.trim()
    ? tabs
        .filter((tab) => tab !== active)
        .map((tab) => [
          tab,
          inTab(tab).filter((p) =>
            matchesSearch(p, query, categoryName(p.category)),
          ).length,
        ])
        .filter(([, n]) => n > 0)
    : [];
  const totals = cartTotals(cart, form.days || 1);
  // The fare's increase applies to the rentals, not the purchases.
  const offered = fareChoices(fares).length > 1 && totals.rental > 0;
  const fareChoice = fareFor(fares, offered ? fare : "standard");
  const markup = fareMarkup(totals.rental, fareChoice.percent);
  const fareText = offered
    ? f.message(f.names[fareChoice.tier], fareChoice.percent)
    : "";
  // With online payment on, a cart priced in full is paid with Midtrans.
  const payable = Boolean(payments?.ready) && !totals.needsQuote;
  const order = () => ({
    kind: "shop",
    lines: cart.map((line) => ({
      source: "product",
      id: line.productId,
      mode: line.mode,
      quantity: line.quantity,
      size: line.size ?? "",
    })),
    days: Number(form.days) || 1,
    startDate: form.startDate,
    fare: fareChoice.tier,
    name: form.name,
    whatsapp: form.whatsapp,
    email: form.email,
    notes: form.notes,
    delivery,
  });
  const quantity = (key) =>
    cart.find((line) => line.key === key)?.quantity ?? 0;
  // Every size of a product in the cart in one way, for its card.
  const inCart = (productId, mode) =>
    cart
      .filter((line) => line.productId === productId && line.mode === mode)
      .reduce((total, line) => total + line.quantity, 0);
  const productOf = (line) =>
    shop.products.find((p) => p.id === line.productId);
  // What one more of a cart line may take: the units left of its size.
  const lineLeft = (line) => {
    const product = productOf(line);
    return product
      ? (unitsLeft(product, stock, line.mode, line.size) ?? 10)
      : 10;
  };
  const change = (item, delta) => {
    const { key, name, price, mode, productId, size } = item;
    setCart((current) =>
      addLine(current, { key, name, price, mode, productId, size }, delta),
    );
    setMessage("");
  };
  // From the product window: the size and quantity picked, to buy or rent.
  function addSized(product, mode, size, count) {
    const key = keyOf(mode, product.id, size);
    const left = unitsLeft(product, stock, mode, size) ?? 10;
    const room = Math.max(0, Math.min(left, 10) - quantity(key));
    if (!room) return;
    change(
      {
        key,
        name: product.name,
        price: product[mode === "sale" ? "salePrice" : "rentalPrice"],
        mode,
        productId: product.id,
        size,
      },
      Math.min(count, room),
    );
  }
  // A cart line moved to another size joins a line already in that size.
  function changeSize(line, size) {
    const key = keyOf(line.mode, line.productId, size);
    setCart((current) => {
      const same = current.find((l) => l.key === key);
      return same
        ? current
            .filter((l) => l !== line)
            .map((l) =>
              l === same
                ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) }
                : l,
            )
        : current.map((l) => (l === line ? { ...l, key, size } : l));
    });
    setMessage("");
  }
  function onKeyDown(event) {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
      event.key
    ];
    if (!step) return;
    event.preventDefault();
    const next =
      tabs[(tabs.indexOf(active) + step + tabs.length) % tabs.length];
    showTab(next);
    tabRefs.current[next]?.focus();
  }
  const today = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" });
  function openCheckout() {
    setError("");
    setMessage("");
    if (!form.startDate) setForm((f) => ({ ...f, startDate: today() }));
    dialog.current?.showModal();
  }
  function review(event) {
    event.preventDefault();
    try {
      setMessage(
        checkoutMessage(
          cart,
          {
            ...form,
            fare: { text: fareText, markup },
            delivery: deliveryChoice(shop.delivery, delivery, locale),
          },
          today(),
          locale,
        ),
      );
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      const value =
        key === "days" ? Number(e.target.value) || "" : e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      setMessage("");
    },
  });
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
        <div className="shop-services-side">
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
                onClick={() => showTab(key)}
                onKeyDown={onKeyDown}
              >
                <TabIcon name={key} />
                <span>{s.groups[key][0]}</span>
              </button>
            ))}
          </div>
          <ServiceBanner service={service} locale={locale} locks={locks} />
        </div>
        <div
          className="shop-service-panel"
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${active}`}
        >
          <h3>{title}</h3>
          <p className="shop-service-text">{text}</p>
          {items.length > 0 && (
            <div className="shop-finder" role="search" aria-label={s.filters}>
              <label className="shop-finder-search">
                <span className="sr-only">{s.search}</span>
                <SearchIcon />
                <input
                  type="search"
                  placeholder={s.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                />
                {query && (
                  <button
                    type="button"
                    aria-label={s.clearSearch}
                    onClick={() => setQuery("")}
                  >
                    ×
                  </button>
                )}
              </label>
              {categories.length > 1 && (
                <label className="shop-finder-select">
                  <span className="sr-only">{s.category}</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">{s.allCategories}</option>
                    {categories.map((key) => (
                      <option key={key} value={key}>
                        {categoryName(key)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="shop-finder-select">
                <span className="sr-only">{s.sort}</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {sortOrders.map((key) => (
                    <option key={key} value={key}>
                      {s.sorts[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={"shop-finder-toggle" + (available ? " is-on" : "")}
              >
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                />
                {s.available}
              </label>
            </div>
          )}
          {items.length > 0 && (
            <div className="shop-finder-status">
              <p aria-live="polite">{s.count(shown.length, items.length)}</p>
              {filtered && (
                <button type="button" onClick={resetFilters}>
                  {s.reset}
                </button>
              )}
            </div>
          )}
          {elsewhere.length > 0 && (
            <div className="shop-finder-elsewhere">
              <span>{s.elsewhere}</span>
              {elsewhere.map(([tab, n]) => (
                <button type="button" key={tab} onClick={() => showTab(tab)}>
                  {s.groups[tab][0]} <span>{n}</span>
                </button>
              ))}
            </div>
          )}
          {items.length > 0 && !shown.length ? (
            <p className="shop-finder-empty">{s.noMatch}</p>
          ) : items.length ? (
            <ul className="shop-item-grid">
              {shown.map((item) => {
                const count = quantity(item.key);
                return (
                  <li
                    className={"shop-item" + (item.locked ? " is-locked" : "")}
                    key={item.key}
                  >
                    {item.locked && <LockedBadge locale={locale} />}
                    <div
                      className="shop-item-visual"
                      onClick={
                        item.product && !item.locked
                          ? () =>
                              setDetail({
                                product: item.product,
                                mode: item.mode,
                                add: !item.locked,
                              })
                          : undefined
                      }
                    >
                      <ProductVisual product={item.visual} locale={locale} />
                    </div>
                    <div className="shop-item-body">
                      <p className="shop-service-tag">
                        {buying ? s.buyTag : s.rentalTag}
                      </p>
                      <h4>
                        {item.product && !item.locked ? (
                          <button
                            type="button"
                            className="shop-product-open"
                            aria-label={t.detail.open(item.name)}
                            onClick={() =>
                              setDetail({
                                product: item.product,
                                mode: item.mode,
                                add: !item.locked,
                              })
                            }
                          >
                            {item.name}
                          </button>
                        ) : (
                          item.name
                        )}
                      </h4>
                      {item.info && (
                        <p className="shop-item-info">{item.info}</p>
                      )}
                      <p className="shop-item-price">
                        {item.price === null
                          ? s.askPrice
                          : rupiah(item.price, locale)}
                        {item.unit && <small> {item.unit}</small>}
                      </p>
                      {item.locked ? null : item.product?.sizes?.length ? (
                        // Gear with sizes goes into the cart from its window.
                        <>
                          <button
                            type="button"
                            className="shop-item-add"
                            disabled={item.left <= 0}
                            onClick={() =>
                              setDetail({
                                product: item.product,
                                mode: item.mode,
                                add: true,
                              })
                            }
                          >
                            {item.left <= 0 ? s.out : t.detail.pickSize}
                          </button>
                          {inCart(item.productId, item.mode) > 0 && (
                            <small className="shop-item-in-cart">
                              {t.detail.inCart(
                                inCart(item.productId, item.mode),
                              )}
                            </small>
                          )}
                        </>
                      ) : count ? (
                        <div className="shop-item-stepper">
                          <button
                            type="button"
                            aria-label={s.less(item.name)}
                            onClick={() => change(item, -1)}
                          >
                            −
                          </button>
                          <span aria-live="polite">{count}</span>
                          <button
                            type="button"
                            aria-label={s.more(item.name)}
                            disabled={count >= item.left}
                            onClick={() => change(item, 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : item.left <= 0 ? (
                        <p className="shop-item-out">{s.out}</p>
                      ) : (
                        <button
                          type="button"
                          className="shop-item-add"
                          aria-label={s.addLabel(item.name)}
                          onClick={() => change(item, 1)}
                        >
                          <CartIcon /> {s.add}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="shop-empty">{t.teaserEmpty}</p>
          )}
        </div>
      </div>
      <div className="shop-cart-bar" data-reveal>
        <span className="shop-cart-icon">
          <CartIcon />
        </span>
        <p>
          <strong>
            {s.cart} · {s.cartCount(totals.count)}
          </strong>
          <small>
            {totals.count
              ? `${s.estimate} ${rupiah(totals.total, locale)}${totals.hasRental ? " " + s.message.perDay : ""}`
              : s.cartEmpty}
          </small>
        </p>
        <button
          type="button"
          className="button dark"
          disabled={!totals.count}
          onClick={openCheckout}
        >
          {s.checkout} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="shop-teaser-bottom">
        <p>{s.note}</p>
      </div>
      <dialog
        ref={dialog}
        className="modal shop-checkout"
        aria-labelledby={`${id}-checkout`}
      >
        <button
          type="button"
          className="close-modal"
          aria-label={s.close}
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <p className="eyebrow">ZANCLUS DIVE SHOP</p>
        <h2 id={`${id}-checkout`}>{s.checkoutTitle}</h2>
        <p>{payable ? p.shopIntro : s.checkoutIntro}</p>
        <ul className="shop-checkout-lines">
          {cart.map((line) => {
            const product = productOf(line);
            return (
              <li key={line.key}>
                <span>
                  <small>
                    {line.mode === "sale" ? s.message.buy : s.message.rent}
                  </small>
                  {product ? (
                    <button
                      type="button"
                      className="shop-product-open"
                      aria-label={t.detail.open(line.name)}
                      onClick={() =>
                        setDetail({ product, mode: line.mode, add: false })
                      }
                    >
                      {line.name}
                    </button>
                  ) : (
                    <strong>{line.name}</strong>
                  )}
                  <small>
                    {line.price === null
                      ? s.askPrice
                      : rupiah(line.price, locale) +
                        (line.mode === "rental" ? " " + s.message.perDay : "")}
                  </small>
                  {product?.sizes?.length > 0 && (
                    <label className="shop-cart-size">
                      {t.detail.size}
                      <select
                        aria-label={t.cartSize(line.name)}
                        value={line.size ?? ""}
                        onChange={(e) => changeSize(line, e.target.value)}
                      >
                        {product.sizes.map((size) => {
                          const left = unitsLeft(
                            product,
                            stock,
                            line.mode,
                            size,
                          );
                          return (
                            <option
                              key={size}
                              value={size}
                              disabled={left === 0}
                            >
                              {size}
                              {left === 0 ? ` (${t.detail.sizeOut})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  )}
                </span>
                <span className="shop-item-stepper">
                  <button
                    type="button"
                    aria-label={s.less(line.name)}
                    onClick={() => change(line, -1)}
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={s.more(line.name)}
                    disabled={line.quantity >= lineLeft(line)}
                    onClick={() => change(line, 1)}
                  >
                    +
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {!cart.length && <p className="muted">{s.cartEmpty}</p>}
        <dl className="shop-checkout-totals">
          {totals.sale > 0 && (
            <div>
              <dt>{s.buyTotal}</dt>
              <dd>{rupiah(totals.sale, locale)}</dd>
            </div>
          )}
          {totals.hasRental && (
            <div>
              <dt>{s.rentTotal(form.days || 1)}</dt>
              <dd>{rupiah(totals.rental, locale)}</dd>
            </div>
          )}
          {markup > 0 && (
            <div>
              <dt>{f.line(f.names[fareChoice.tier], fareChoice.percent)}</dt>
              <dd>{rupiah(markup, locale)}</dd>
            </div>
          )}
          {fee > 0 && (
            <div>
              <dt>{t.delivery.fee(zoneName)}</dt>
              <dd>{rupiah(fee, locale)}</dd>
            </div>
          )}
          <div>
            <dt>{payable ? p.total : s.estimate}</dt>
            <dd>{rupiah(totals.total + markup + fee, locale)}</dd>
          </div>
        </dl>
        {offered && !message && (
          <FareChoice
            fares={fares}
            base={totals.rental}
            value={fareChoice.tier}
            onChange={setFare}
            locale={locale}
          />
        )}
        {totals.needsQuote && <p className="muted">{s.quoteNote}</p>}
        {message && payable ? (
          <div className="shop-checkout-done">
            <PayPanel
              order={order()}
              total={totals.total + markup + fee}
              message={message}
              whatsapp={whatsapp}
              sandbox={payments.sandbox}
              locale={locale}
              showTotal={false}
            />
            <button
              type="button"
              className="shop-checkout-edit"
              onClick={() => setMessage("")}
            >
              {s.edit}
            </button>
          </div>
        ) : message ? (
          <div className="shop-checkout-done">
            {payments?.ready && <p className="muted">{p.quoteOnly}</p>}
            <pre>{message}</pre>
            <a
              className="button dark"
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.send} <span aria-hidden="true">↗</span>
            </a>
            <button
              type="button"
              className="shop-checkout-edit"
              onClick={() => setMessage("")}
            >
              {s.edit}
            </button>
          </div>
        ) : (
          <form onSubmit={review} noValidate>
            <p className="form-required-note">
              <span aria-hidden="true">*</span> {s.requiredNote}
            </p>
            <FormField id={`${id}-name`} label={s.name} icon="user" required>
              <input
                id={`${id}-name`}
                maxLength={80}
                autoComplete="name"
                required
                placeholder={s.namePlaceholder}
                {...field("name")}
              />
            </FormField>
            <div className="form-row">
              <FormField
                id={`${id}-whatsapp`}
                label={s.whatsapp}
                icon="whatsapp"
                required
              >
                <input
                  id={`${id}-whatsapp`}
                  type="tel"
                  inputMode="tel"
                  pattern="\+?[0-9 \(\)\.\-]{8,30}"
                  autoComplete="tel"
                  maxLength={30}
                  required
                  placeholder="+62 812 3456 7890"
                  {...field("whatsapp")}
                />
              </FormField>
              <FormField
                id={`${id}-email`}
                label={s.email}
                icon="email"
                optional={s.optional}
              >
                <input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="email"
                  maxLength={200}
                  placeholder={s.emailPlaceholder}
                  {...field("email")}
                />
              </FormField>
            </div>
            {totals.hasRental && (
              <div className="form-row">
                <FormField
                  id={`${id}-start`}
                  label={s.startDate}
                  icon="calendar"
                  required
                >
                  <input
                    id={`${id}-start`}
                    type="date"
                    min={today()}
                    required
                    {...field("startDate")}
                  />
                </FormField>
                <FormField
                  id={`${id}-days`}
                  label={s.days}
                  icon="days"
                  required
                >
                  <input
                    id={`${id}-days`}
                    type="number"
                    min="1"
                    max="30"
                    required
                    {...field("days")}
                  />
                </FormField>
              </div>
            )}
            <DeliveryChoice
              id={id}
              delivery={shop.delivery}
              value={delivery}
              onChange={(next) => {
                setDelivery(next);
                setMessage("");
                setError("");
              }}
              locale={locale}
            />
            <FormField
              id={`${id}-notes`}
              label={s.notes}
              icon="note"
              optional={s.optional}
            >
              <textarea
                id={`${id}-notes`}
                rows="3"
                maxLength={500}
                placeholder={s.notesPlaceholder}
                {...field("notes")}
              />
            </FormField>
            {error && (
              <p className="booking-error" role="alert">
                {error}
              </p>
            )}
            <button className="button dark" disabled={!cart.length}>
              {payable ? p.toPay : s.review}
            </button>
          </form>
        )}
      </dialog>
      {detail && (
        <ProductDetail
          key={detail.product.id + detail.mode}
          product={detail.product}
          pair={pairOf(
            shop.products.filter((p) => !itemLocked(locks, "product", p.id)),
            detail.product,
          )}
          mode={detail.mode}
          stock={stock}
          locale={locale}
          category={dictionary(locale).shopCategories[detail.product.category]}
          delivery={shop.delivery}
          onAdd={
            detail.add
              ? (size, count) =>
                  addSized(detail.product, detail.mode, size, count)
              : null
          }
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
