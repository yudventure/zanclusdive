"use client";
import { useId, useRef, useState } from "react";
import ProductVisual from "./ProductVisual.jsx";
import { rupiah } from "../shop-model.js";
import { dictionary, localeHref } from "../i18n.js";
import { rentalGroups, priceText } from "../price-list.js";
import { addLine, cartTotals, checkoutMessage } from "./cart.js";
import FormField from "../components/FormField.jsx";

const tabs = ["buy", ...rentalGroups];

// Illustration for a rental item, picked from its Indonesian name.
const visualRules = [
  [/masker|mask|snorkel/i, "mask"],
  [/fin|booties/i, "fins"],
  [/wetsuit/i, "suit"],
  [/bcd|pelampung|weight/i, "bcd"],
  [/regulator/i, "regulator"],
  [/tabung|isi ulang|tank|refill/i, "cylinder"],
  [/computer/i, "computer"],
  [/senter|torch/i, "light"],
  [/kamera|camera|gopro/i, "camera"],
];
const visualFor = (name) =>
  visualRules.find(([rule]) => rule.test(name))?.[1] ?? "mask";

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

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3 4h2l2.4 11h10.2L20 7H6.2M10 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Homepage Dive Shop: services on the left, the selected service's gear on
// the right as one card per item with its own price and cart button. The
// cart is checked out into a WhatsApp order.
export default function ShopTeaser({
  shop,
  priceList,
  whatsapp,
  locale = "en",
}) {
  const t = dictionary(locale).shop;
  const s = t.teaser;
  const [active, setActive] = useState("buy");
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
  const id = useId();
  const tabRefs = useRef({});
  const dialog = useRef(null);
  const [title, text] = s.groups[active];
  const buying = active === "buy";
  const items = buying
    ? shop.products
        .filter((p) => p.enabled && p.saleEnabled)
        .map((p) => ({
          key: "buy:" + p.id,
          name: p.name,
          info: p.specification,
          price: p.salePrice,
          unit: "",
          mode: "sale",
          visual: p,
        }))
    : priceList[active].map((item, index) => ({
        key: `${active}:${index}`,
        name: priceText(item.name, locale),
        info: priceText(item.info, locale),
        price: item.price,
        unit: priceText(item.unit, locale),
        mode: "rental",
        visual: { category: visualFor(item.name.id), image: "" },
      }));
  const totals = cartTotals(cart, form.days || 1);
  const quantity = (key) =>
    cart.find((line) => line.key === key)?.quantity ?? 0;
  const change = (item, delta) => {
    const { key, name, price, mode } = item;
    setCart((current) => addLine(current, { key, name, price, mode }, delta));
    setMessage("");
  };
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
      setMessage(checkoutMessage(cart, form, today(), locale));
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
          {items.length ? (
            <ul className="shop-item-grid">
              {items.map((item) => {
                const count = quantity(item.key);
                return (
                  <li className="shop-item" key={item.key}>
                    <ProductVisual product={item.visual} />
                    <div className="shop-item-body">
                      <p className="shop-service-tag">
                        {buying ? s.buyTag : s.rentalTag}
                      </p>
                      <h4>{item.name}</h4>
                      {item.info && (
                        <p className="shop-item-info">{item.info}</p>
                      )}
                      <p className="shop-item-price">
                        {item.price === null
                          ? s.askPrice
                          : rupiah(item.price, locale)}
                        {item.unit && <small> {item.unit}</small>}
                      </p>
                      {count ? (
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
                            disabled={count >= 10}
                            onClick={() => change(item, 1)}
                          >
                            +
                          </button>
                        </div>
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
        <p>{s.checkoutIntro}</p>
        <ul className="shop-checkout-lines">
          {cart.map((line) => (
            <li key={line.key}>
              <span>
                <small>
                  {line.mode === "sale" ? s.message.buy : s.message.rent}
                </small>
                <strong>{line.name}</strong>
                <small>
                  {line.price === null
                    ? s.askPrice
                    : rupiah(line.price, locale) +
                      (line.mode === "rental" ? " " + s.message.perDay : "")}
                </small>
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
                  disabled={line.quantity >= 10}
                  onClick={() => change(line, 1)}
                >
                  +
                </button>
              </span>
            </li>
          ))}
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
          <div>
            <dt>{s.estimate}</dt>
            <dd>{rupiah(totals.total, locale)}</dd>
          </div>
        </dl>
        {totals.needsQuote && <p className="muted">{s.quoteNote}</p>}
        {message ? (
          <div className="shop-checkout-done">
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
              {s.review}
            </button>
          </form>
        )}
      </dialog>
    </section>
  );
}
