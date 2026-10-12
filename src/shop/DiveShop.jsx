"use client";
import FormField from "../components/FormField.jsx";
import { useEffect, useState, useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import { photoSrcSet } from "../photography.js";
import ProductVisual from "./ProductVisual.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import LanguageSwitch from "../components/LanguageSwitch.jsx";
import { rupiah, quoteOrder, orderMessage } from "../shop-model.js";
import { dictionary, intlLocale, localeHref } from "../i18n.js";

export default function DiveShop({
  shop,
  contact,
  images,
  activities,
  initialMode,
  today,
  tagline,
  locale = "en",
}) {
  const dict = dictionary(locale);
  const t = dict.shop;
  const shopCategories = dict.shopCategories;
  const href = (path) => localeHref(locale, path);
  const money = (amount) => rupiah(amount, locale);
  const motionRoot = useRef(null);
  const [mode, setMode] = useState(initialMode),
    [category, setCategory] = useState("all"),
    [search, setSearch] = useState("");
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
  const products = eligible.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      `${p.name} ${p.description} ${shopCategories[p.category]}`
        .toLocaleLowerCase(intlLocale[locale])
        .includes(search.toLocaleLowerCase(intlLocale[locale])),
  );
  const categories = [...new Set(eligible.map((p) => p.category))];
  let quote;
  try {
    if (cart.length)
      quote = quoteOrder(shop.products, cart, details.days, locale);
  } catch {}
  const hasRental = cart.some((p) => p.mode === "rental");
  const count = cart.reduce((n, p) => n + p.quantity, 0);
  function changeCart(next) {
    setCart(next);
    setMessage("");
    setError("");
  }
  function add(product) {
    const item = cart.find((p) => p.id === product.id && p.mode === mode);
    if (item?.quantity >= 10) {
      setNotice(t.maxUnits);
      return;
    }
    changeCart(
      item
        ? cart.map((p) => (p === item ? { ...p, quantity: p.quantity + 1 } : p))
        : [...cart, { id: product.id, mode, quantity: 1 }],
    );
    setNotice(t.added(product.name, mode === "sale"));
  }
  function changeDetails(key, value) {
    setDetails({ ...details, [key]: value });
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      if (hasRental && details.startDate < today) throw new Error(t.pastDate);
      setMessage(orderMessage(shop.products, cart, details, false, locale));
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
          <a href={href("/")}>{dict.common.home}</a>
          <a href={href("/#experiences")}>{dict.common.experiences}</a>
          <a href="#catalog" className="active" onClick={() => setMenu(false)}>
            Dive Shop
          </a>
          <a href={href("/#contact")}>{dict.common.contact}</a>
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
            <span>READY FOR YOUR NEXT DIVE</span>
          </div>
        </section>
        <section
          className="shop-catalog"
          id="catalog"
          aria-labelledby="catalog-title"
        >
          <div className="shop-catalog-top" data-reveal>
            <div>
              <p className="eyebrow">GEAR UP, DIVE IN</p>
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
              </div>
              <p className="shop-add-notice" role="status">
                {notice || t.pick}
              </p>
              <div className="shop-product-grid">
                {products.map((product) => {
                  const price =
                    product[mode === "sale" ? "salePrice" : "rentalPrice"];
                  return (
                    <article
                      className="shop-product-card"
                      key={product.id}
                      data-product={product.id}
                      data-reveal
                    >
                      <div className="shop-product-image">
                        <ProductVisual product={product} />
                        <span
                          className={"shop-stock stock-" + product.availability}
                        >
                          {dict.availability[product.availability]}
                        </span>
                      </div>
                      <div className="shop-product-info">
                        <p className="shop-category">
                          {shopCategories[product.category]}
                        </p>
                        <h3>{product.name}</h3>
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
                          <button
                            disabled={product.availability === "unavailable"}
                            aria-label={t.add(product.name, mode === "sale")}
                            onClick={() => add(product)}
                          >
                            <span aria-hidden="true">+</span>{" "}
                            {mode === "sale" ? t.buyShort : t.rentShort}
                          </button>
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
              <p className="eyebrow">YOUR GEAR, YOUR PLAN</p>
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
                        (p) => p.id === item.id && p.mode === item.mode,
                      );
                      return (
                        <li key={item.id + item.mode}>
                          <div className="shop-cart-heading">
                            <div>
                              <span>
                                {item.mode === "sale" ? t.saleTag : t.rentalTag}
                              </span>
                              <h3>{product.name}</h3>
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
                                {Array.from({ length: 10 }, (_, i) => (
                                  <option key={i} value={i + 1}>
                                    {i + 1}
                                  </option>
                                ))}
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
                    <div className="shop-total">
                      <span>{t.estimate(quote?.needsQuote)}</span>
                      <strong>
                        {quote ? money(quote.total) : t.checkDuration}
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
                      {t.prepare}
                    </button>
                  </form>
                  {message && (
                    <div className="shop-message" role="status">
                      <h3>{t.ready}</h3>
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
            <p className="eyebrow">MADE SIMPLE</p>
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
    </div>
  );
}
