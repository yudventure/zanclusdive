"use client";
import FormField from "../components/FormField.jsx";
import SiteNavLinks from "../components/SiteNavLinks.jsx";
import { useEffect, useState, useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import { photoSrcSet } from "../photography.js";
import ProductVisual from "./ProductVisual.jsx";
import ProductDetail from "./ProductDetail.jsx";
import DeliveryChoice, {
  firstDelivery,
  deliveryFee,
} from "../components/DeliveryChoice.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import {
  rupiah,
  quoteOrder,
  orderMessage,
  unitsLeft,
  stockBadge,
  deliveryChoice,
  productAs,
  pairOf,
} from "../shop-model.js";
import PayPanel from "../components/PayPanel.jsx";
import FareChoice from "../components/FareChoice.jsx";
import { fareChoices, fareFor, fareMarkup } from "../fare-model.js";
import { dictionary, localeHref } from "../i18n.js";
import { LockedBadge } from "../components/Locked.jsx";
import { noLocks, itemLocked } from "../developer.js";
import { filterItems, sortOrders } from "./shop-filter.js";

export default function DiveShop({
  shop,
  contact,
  images,
  activities,
  initialMode,
  today,
  tagline,
  locale = "en",
  locks = noLocks,
  payments,
  fares,
  stock = {},
}) {
  const dict = dictionary(locale);
  const t = dict.shop;
  const p = dict.payment;
  const f = dict.fare;
  const shopCategories = dict.shopCategories;
  const href = (path) => localeHref(locale, path);
  const money = (amount) => rupiah(amount, locale);
  const motionRoot = useRef(null);
  const [mode, setMode] = useState(initialMode),
    [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("default"),
    [available, setAvailable] = useState(false);
  const [cart, setCart] = useState([]),
    [details, setDetails] = useState({
      name: "",
      whatsapp: "",
      email: "",
      startDate: today,
      days: 1,
      notes: "",
    });
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  // Standard, Comfort or Flexi for the rentals.
  const [fare, setFare] = useState("standard");
  // The product window: { product, mode, add } (add false from the cart).
  const [detail, setDetail] = useState(null);
  // Picked up at the dive center or delivered: { method, zone, address }.
  const [delivery, setDelivery] = useState(() => firstDelivery(shop.delivery));
  const fee = deliveryFee(shop.delivery, delivery);
  const zoneName =
    shop.delivery?.zones.find((z) => z.id === delivery.zone)?.name ?? "";
  const [menu, setMenu] = useState(false),
    [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const eligible = shop.products.filter(
    (p) => p.enabled && p[mode === "sale" ? "saleEnabled" : "rentalEnabled"],
  );
  // The same search and filters as the homepage Dive Shop.
  const products = filterItems(
    eligible.map((p) => ({
      product: p,
      name: p.name,
      price: p[mode === "sale" ? "salePrice" : "rentalPrice"],
      left: unitsLeft(p, stock, mode) ?? 10,
    })),
    { query: search, category, available, sort },
    { categoryName: (key) => shopCategories[key], locale },
  ).map((item) => item.product);
  const categories = [...new Set(eligible.map((p) => p.category))];
  let quote;
  try {
    if (cart.length)
      quote = quoteOrder(shop.products, cart, details.days, locale);
  } catch {}
  const hasRental = cart.some((p) => p.mode === "rental");
  // The fare's increase applies to the rentals, not the purchases.
  const rentalBase = (quote?.lines ?? [])
    .filter((line) => line.mode === "rental" && line.total !== null)
    .reduce((sum, line) => sum + line.total, 0);
  const offered = fareChoices(fares).length > 1 && rentalBase > 0;
  const fareChoice = fareFor(fares, offered ? fare : "standard");
  const markup = fareMarkup(rentalBase, fareChoice.percent);
  const fareText = offered
    ? f.message(f.names[fareChoice.tier], fareChoice.percent)
    : "";
  // With online payment on, an order priced in full is paid with Midtrans.
  const payable =
    Boolean(payments?.ready) && Boolean(quote) && !quote.needsQuote;
  const count = cart.reduce((n, p) => n + p.quantity, 0);
  function changeCart(next) {
    setCart(next);
    setMessage("");
    setError("");
  }
  // Adds gear in the current mode; gear with sizes in the size picked in
  // its window.
  function add(product, size = "", quantity = 1) {
    const item = cart.find(
      (p) => p.id === product.id && p.mode === mode && p.size === size,
    );
    // Gear that follows the warehouse stops at the units left.
    const left = unitsLeft(product, stock, mode, size) ?? 10;
    const name = size ? `${product.name} ${size}` : product.name;
    if ((item?.quantity ?? 0) >= left) {
      setNotice(left >= 10 ? t.maxUnits : t.onlyLeft(name, left));
      return;
    }
    const next = Math.min(left, (item?.quantity ?? 0) + quantity);
    changeCart(
      item
        ? cart.map((p) => (p === item ? { ...p, quantity: next } : p))
        : [...cart, { id: product.id, mode, size, quantity: next }],
    );
    setNotice(t.added(name, mode === "sale"));
  }
  // A cart line moved to another size joins a line already in that size.
  function changeSize(item, size) {
    const same = cart.find(
      (p) =>
        p !== item &&
        p.id === item.id &&
        p.mode === item.mode &&
        p.size === size,
    );
    changeCart(
      same
        ? cart
            .filter((p) => p !== item)
            .map((p) =>
              p === same
                ? { ...p, quantity: Math.min(10, p.quantity + item.quantity) }
                : p,
            )
        : cart.map((p) => (p === item ? { ...p, size } : p)),
    );
  }
  const openDetail = (product, canAdd = true, lineMode = mode) =>
    setDetail({ product, mode: lineMode, add: canAdd });
  function changeDetails(key, value) {
    setDetails({ ...details, [key]: value });
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      if (hasRental && details.startDate < today) throw new Error(t.pastDate);
      setMessage(
        orderMessage(
          shop.products,
          cart,
          {
            ...details,
            fare: { text: fareText, markup },
            delivery: deliveryChoice(shop.delivery, delivery, locale),
          },
          false,
          locale,
        ),
      );
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  const helpURL = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(t.help)}`;
  return (
    <div className="shop-page" ref={motionRoot}>
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#catalog">
        {t.skip}
      </a>
      <header className={"site-header" + (scrolled ? " is-scrolled" : "")}>
        <a
          className="brand"
          href={href("/")}
          aria-label={dict.common.homeLabel}
        >
          <img
            src="/assets/logo-header-dark.svg"
            width="176"
            height="44"
            alt="Zanclus Dive Center"
          />
        </a>
        <button
          className="menu-toggle"
          aria-label={menu ? dict.common.closeMenu : dict.common.openMenu}
          aria-expanded={menu}
          aria-controls="shop-navigation"
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
        </button>
        <nav
          id="shop-navigation"
          className={menu ? "open" : ""}
          aria-label={dict.common.mainNav}
        >
          <SiteNavLinks
            locale={locale}
            page="shop"
            activities={activities}
            onNavigate={() => setMenu(false)}
          />
        </nav>
        <div className="header-actions">
          <LanguageSwitch locale={locale} path="/dive-shop" />
          <a
            className="button quick-service"
            href={helpURL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.gearHelp}
          </a>
        </div>
      </header>
      <main>
        <section className="shop-hero">
          <div className="shop-hero-copy">
            <a className="shop-back" href={href("/")}>
              {t.back}
            </a>
            <p className="eyebrow">ZANCLUS / DIVE SHOP</p>
            <h1>{shop.heading}</h1>
            <p className="shop-lead">{shop.description}</p>
            <div className="shop-hero-note">
              <span className="tiny-dot" /> {t.heroNote}
            </div>
            <a className="shop-hero-service" href={href("/service")}>
              <span>
                {dict.service.fromShop[0]}
                <strong>{dict.service.fromShop[1]}</strong>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="shop-hero-art">
            <img
              src={images.shop}
              srcSet={photoSrcSet(images.shop)}
              sizes="(max-width: 700px) 90vw, 420px"
              alt={t.heroAlt}
              width="1000"
              height="667"
              fetchPriority="high"
            />
            <span>{dict.kickers.shopReady}</span>
          </div>
        </section>
        <section
          className="shop-catalog"
          id="catalog"
          aria-labelledby="catalog-title"
        >
          <div className="shop-catalog-top" data-reveal>
            <div>
              <p className="eyebrow">{dict.kickers.shopGearUp}</p>
              <h2 id="catalog-title">{t.catalogTitle}</h2>
            </div>
            <a className="shop-order-shortcut" href="#order">
              {t.yourOrder} <span>{count}</span> ↓
            </a>
          </div>
          <div className="shop-layout">
            <div className="shop-products-area">
              <div className="shop-controls">
                <div
                  className="shop-mode"
                  role="group"
                  aria-label={t.serviceType}
                >
                  <button
                    aria-pressed={mode === "sale"}
                    onClick={() => {
                      setMode("sale");
                      setCategory("all");
                    }}
                  >
                    {t.buy}
                  </button>
                  <button
                    aria-pressed={mode === "rental"}
                    onClick={() => {
                      setMode("rental");
                      setCategory("all");
                    }}
                  >
                    {t.rent}
                  </button>
                </div>
                <label className="shop-search">
                  <span className="sr-only">{t.search}</span>
                  <input
                    type="search"
                    placeholder={t.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="shop-filter-row">
                <p>{t.count(products.length, mode === "sale")}</p>
                <div className="shop-filter-controls">
                  <label>
                    <span className="sr-only">{t.category}</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">{t.allCategories}</option>
                      {categories.map((key) => (
                        <option key={key} value={key}>
                          {shopCategories[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">{t.teaser.sort}</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      {sortOrders.map((key) => (
                        <option key={key} value={key}>
                          {t.teaser.sorts[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    className={
                      "shop-filter-toggle" + (available ? " is-on" : "")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={available}
                      onChange={(e) => setAvailable(e.target.checked)}
                    />
                    {t.teaser.available}
                  </label>
                </div>
              </div>
              <p className="shop-add-notice" role="status">
                {notice || t.pick}
              </p>
              <div className="shop-product-grid">
                {products.map((product) => {
                  const price =
                    product[mode === "sale" ? "salePrice" : "rentalPrice"];
                  const locked = itemLocked(locks, "product", product.id);
                  const badge = stockBadge(
                    product,
                    stock,
                    mode,
                    dict.availability,
                  );
                  return (
                    <article
                      className={
                        "shop-product-card" + (locked ? " is-locked" : "")
                      }
                      key={product.id}
                      data-product={product.id}
                      data-reveal
                    >
                      {locked && <LockedBadge locale={locale} />}
                      <div
                        className="shop-product-image"
                        onClick={locked ? undefined : () => openDetail(product)}
                      >
                        <ProductVisual
                          product={productAs(product, mode)}
                          locale={locale}
                        />
                        <span className={"shop-stock stock-" + badge.state}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="shop-product-info">
                        <p className="shop-category">
                          {shopCategories[product.category]}
                        </p>
                        <h3>
                          {locked ? (
                            product.name
                          ) : (
                            <button
                              type="button"
                              className="shop-product-open"
                              aria-label={t.detail.open(product.name)}
                              onClick={() => openDetail(product)}
                            >
                              {product.name}
                            </button>
                          )}
                        </h3>
                        <p className="shop-description">
                          {product.description}
                        </p>
                        {product.specification && (
                          <p className="shop-specification">
                            {product.specification}
                          </p>
                        )}
                        <div className="shop-product-bottom">
                          <p className="shop-price">
                            {price === null ? t.askPrice : money(price)}
                            {mode === "rental" && price !== null && (
                              <small>{t.perDay}</small>
                            )}
                          </p>
                          {product.sizes?.length ? (
                            // Gear with sizes is added from its window.
                            <button
                              disabled={locked || badge.state === "unavailable"}
                              aria-label={`${t.detail.pickSize} ${product.name}`}
                              onClick={() => openDetail(product)}
                            >
                              {t.detail.pickSize}
                            </button>
                          ) : (
                            <button
                              disabled={locked || badge.state === "unavailable"}
                              aria-label={t.add(product.name, mode === "sale")}
                              onClick={() => add(product)}
                            >
                              <span aria-hidden="true">+</span>{" "}
                              {mode === "sale" ? t.buyShort : t.rentShort}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!products.length && (
                <div className="shop-empty">
                  <h3>{t.emptyTitle}</h3>
                  <p>{t.emptyText}</p>
                  <a
                    className="button dark"
                    href={helpURL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.askTeam}
                  </a>
                </div>
              )}
            </div>
            <aside
              className="shop-order"
              id="order"
              aria-labelledby="order-title"
            >
              <p className="eyebrow">{dict.kickers.shopYourGear}</p>
              <h2 id="order-title">{t.orderTitle}</h2>
              <p className="shop-order-intro">{t.orderIntro}</p>
              {!cart.length ? (
                <div className="shop-cart-empty">
                  <span aria-hidden="true">＋</span>
                  <p>{t.cartEmpty}</p>
                  <small>{t.cartHint}</small>
                </div>
              ) : (
                <>
                  <ul className="shop-cart-list">
                    {cart.map((item) => {
                      const product = shop.products.find(
                        (p) => p.id === item.id,
                      );
                      const line = quote?.lines.find(
                        (p) =>
                          p.id === item.id &&
                          p.mode === item.mode &&
                          p.size === (item.size ?? ""),
                      );
                      return (
                        <li key={item.id + item.mode + (item.size ?? "")}>
                          <div className="shop-cart-heading">
                            <div>
                              <span>
                                {item.mode === "sale" ? t.saleTag : t.rentalTag}
                              </span>
                              <h3>
                                <button
                                  type="button"
                                  className="shop-product-open"
                                  aria-label={t.detail.open(product.name)}
                                  onClick={() =>
                                    openDetail(product, false, item.mode)
                                  }
                                >
                                  {product.name}
                                </button>
                              </h3>
                            </div>
                            <button
                              aria-label={t.remove(
                                product.name,
                                item.mode === "sale",
                              )}
                              onClick={() =>
                                changeCart(cart.filter((p) => p !== item))
                              }
                            >
                              ×
                            </button>
                          </div>
                          {product.sizes?.length > 0 && (
                            <label className="shop-cart-size">
                              {t.detail.size}
                              <select
                                aria-label={t.cartSize(product.name)}
                                value={item.size ?? ""}
                                onChange={(e) =>
                                  changeSize(item, e.target.value)
                                }
                              >
                                {!item.size && (
                                  <option value="">{t.detail.pickSize}</option>
                                )}
                                {product.sizes.map((size) => {
                                  const left = unitsLeft(
                                    product,
                                    stock,
                                    item.mode,
                                    size,
                                  );
                                  return (
                                    <option
                                      key={size}
                                      value={size}
                                      disabled={left === 0}
                                    >
                                      {size}
                                      {left === 0
                                        ? ` (${t.detail.sizeOut})`
                                        : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                          )}
                          <div className="shop-cart-quantity">
                            <label>
                              {t.quantity}
                              <select
                                aria-label={t.quantityOf(
                                  product.name,
                                  item.mode === "sale",
                                )}
                                value={item.quantity}
                                onChange={(e) =>
                                  changeCart(
                                    cart.map((p) =>
                                      p === item
                                        ? {
                                            ...p,
                                            quantity: Number(e.target.value),
                                          }
                                        : p,
                                    ),
                                  )
                                }
                              >
                                {Array.from(
                                  {
                                    length: Math.max(
                                      1,
                                      item.quantity,
                                      unitsLeft(
                                        product,
                                        stock,
                                        item.mode,
                                        item.size,
                                      ) ?? 10,
                                    ),
                                  },
                                  (_, i) => (
                                    <option key={i} value={i + 1}>
                                      {i + 1}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                            <strong>
                              {line?.total === null || !line
                                ? t.askPrice
                                : money(line.total)}
                            </strong>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <form
                    className="shop-order-form"
                    onSubmit={prepare}
                    noValidate
                  >
                    <p className="form-required-note">
                      <span aria-hidden="true">*</span> {t.requiredNote}
                    </p>
                    <FormField
                      id="order-name"
                      label={t.name}
                      icon="user"
                      required
                    >
                      <input
                        id="order-name"
                        required
                        maxLength={80}
                        autoComplete="name"
                        placeholder={t.namePlaceholder}
                        value={details.name}
                        onChange={(e) => changeDetails("name", e.target.value)}
                      />
                    </FormField>
                    <FormField
                      id="order-whatsapp"
                      label={t.whatsapp}
                      icon="whatsapp"
                      required
                    >
                      <input
                        id="order-whatsapp"
                        type="tel"
                        inputMode="tel"
                        pattern="\+?[0-9 \(\)\.\-]{8,30}"
                        autoComplete="tel"
                        required
                        maxLength={30}
                        placeholder="+62 812 3456 7890"
                        value={details.whatsapp}
                        onChange={(e) =>
                          changeDetails("whatsapp", e.target.value)
                        }
                      />
                    </FormField>
                    <FormField
                      id="order-email"
                      label={t.email}
                      icon="email"
                      optional={t.optional}
                    >
                      <input
                        id="order-email"
                        type="email"
                        autoComplete="email"
                        maxLength={200}
                        placeholder={t.emailPlaceholder}
                        value={details.email}
                        onChange={(e) => changeDetails("email", e.target.value)}
                      />
                    </FormField>
                    {hasRental && (
                      <div className="form-row">
                        <FormField
                          id="order-start"
                          label={t.rentalStart}
                          icon="calendar"
                          required
                        >
                          <input
                            id="order-start"
                            type="date"
                            required
                            min={today}
                            value={details.startDate}
                            onChange={(e) =>
                              changeDetails("startDate", e.target.value)
                            }
                          />
                        </FormField>
                        <FormField
                          id="order-days"
                          label={t.days}
                          icon="days"
                          required
                        >
                          <input
                            id="order-days"
                            type="number"
                            required
                            min={1}
                            max={30}
                            step={1}
                            value={details.days}
                            onChange={(e) =>
                              changeDetails("days", Number(e.target.value))
                            }
                          />
                        </FormField>
                      </div>
                    )}
                    <DeliveryChoice
                      id="order"
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
                      id="order-notes"
                      label={t.notes}
                      icon="note"
                      optional={t.optional}
                    >
                      <textarea
                        id="order-notes"
                        rows={2}
                        maxLength={500}
                        placeholder={t.notesPlaceholder}
                        value={details.notes}
                        onChange={(e) => changeDetails("notes", e.target.value)}
                      />
                    </FormField>
                    {offered && (
                      <FareChoice
                        fares={fares}
                        base={rentalBase}
                        value={fareChoice.tier}
                        onChange={(tier) => {
                          setFare(tier);
                          setMessage("");
                        }}
                        locale={locale}
                      />
                    )}
                    <div className="shop-total">
                      <span>
                        {t.estimate(quote?.needsQuote)}
                        {markup > 0 && (
                          <small className="shop-fare-note">
                            {f.line(
                              f.names[fareChoice.tier],
                              fareChoice.percent,
                            )}{" "}
                            {money(markup)}
                          </small>
                        )}
                        {fee > 0 && (
                          <small className="shop-fare-note">
                            {t.delivery.fee(zoneName)} {money(fee)}
                          </small>
                        )}
                      </span>
                      <strong>
                        {quote
                          ? money(quote.total + markup + fee)
                          : t.checkDuration}
                      </strong>
                    </div>
                    {quote?.needsQuote && (
                      <p className="shop-small">{t.excludesQuote}</p>
                    )}
                    <p className="shop-small">{t.confirmNote}</p>
                    {error && (
                      <p className="shop-error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="button dark shop-submit" type="submit">
                      {payable ? p.toPay : t.prepare}
                    </button>
                  </form>
                  {message && payable && (
                    <div className="shop-message" role="status">
                      <h3>{p.summaryPay}</h3>
                      <PayPanel
                        order={{
                          kind: "shop",
                          lines: cart.map((line) => ({
                            source: "product",
                            id: line.id,
                            mode: line.mode,
                            quantity: line.quantity,
                            size: line.size ?? "",
                          })),
                          days: Number(details.days) || 1,
                          startDate: details.startDate,
                          fare: fareChoice.tier,
                          name: details.name,
                          whatsapp: details.whatsapp,
                          email: details.email,
                          notes: details.notes,
                          delivery,
                        }}
                        total={quote.total + markup + fee}
                        message={message}
                        whatsapp={contact.whatsapp}
                        sandbox={payments.sandbox}
                        locale={locale}
                      />
                    </div>
                  )}
                  {message && !payable && (
                    <div className="shop-message" role="status">
                      <h3>{t.ready}</h3>
                      {payments?.ready && (
                        <p className="shop-small">{p.quoteOnly}</p>
                      )}
                      <details>
                        <summary>{t.viewMessage}</summary>
                        <pre>{message}</pre>
                      </details>
                      <a
                        className="button lime shop-send"
                        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.continueWhatsApp}
                      </a>
                      <p className="shop-small">{t.sendNote}</p>
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        </section>
        <section className="shop-how">
          <div>
            <p className="eyebrow">{dict.kickers.shopSimple}</p>
            <h2>
              {t.howTitle[0]}
              <br />
              {t.howTitle[1]}
            </h2>
          </div>
          {t.steps.map(([title, text], index) => (
            <div key={index}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter
        contact={contact}
        activities={activities}
        tagline={tagline}
        locale={locale}
      />
      {count > 0 && (
        <a className="shop-mobile-order" href="#order">
          {t.mobileOrder(count)}{" "}
          <span>{quote ? money(quote.total) : t.checkDuration} ↓</span>
        </a>
      )}
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
          category={shopCategories[detail.product.category]}
          delivery={shop.delivery}
          onAdd={
            detail.add
              ? (size, quantity) => add(detail.product, size, quantity)
              : null
          }
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
