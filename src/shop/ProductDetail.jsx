"use client";
import { useEffect, useId, useRef, useState } from "react";
import ProductVisual from "./ProductVisual.jsx";
import { rupiah, unitsLeft } from "../shop-model.js";
import { dictionary } from "../i18n.js";

// One Dive Shop product in a window, opened from its card or a cart line:
// photo, description, specification, sizes with what is left of each, and
// the price for buying or renting. From a card the guest picks a size and
// a quantity and adds it; from the cart the window only shows the details.
export default function ProductDetail({
  product,
  mode,
  stock,
  locale,
  category,
  onAdd,
  onClose,
}) {
  const ref = useRef(null);
  const id = useId();
  const dict = dictionary(locale);
  const t = dict.shop.detail;
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  const sizes = product.sizes ?? [];
  const left = (s) => unitsLeft(product, stock, mode, s) ?? 10;
  const max = sizes.length && !size ? 10 : left(size);
  // Nothing left of the product, or of the size picked.
  const blocked = (!sizes.length || Boolean(size)) && max <= 0;
  const price = product[mode === "sale" ? "salePrice" : "rentalPrice"];
  const close = () => ref.current?.close();
  function add() {
    if (sizes.length && !size) {
      setError(t.needSize);
      return;
    }
    onAdd(size, Math.min(quantity, max));
    close();
  }
  return (
    <dialog
      ref={ref}
      className="modal shop-detail"
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(event) => {
        // A tap on the dim backdrop closes the window.
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          close();
      }}
    >
      <button
        type="button"
        className="close-modal"
        aria-label={t.close}
        onClick={close}
      >
        ×
      </button>
      <div className="shop-detail-visual">
        <ProductVisual product={product} locale={locale} />
      </div>
      <p className="eyebrow">{category}</p>
      <h2 id={`${id}-title`}>{product.name}</h2>
      <p className="shop-detail-text">{product.description}</p>
      {product.specification && (
        <div className="shop-detail-spec">
          <h3>{t.specification}</h3>
          <p>{product.specification}</p>
        </div>
      )}
      {sizes.length > 0 && (
        <fieldset className="shop-sizes">
          <legend>{t.size}</legend>
          <div>
            {sizes.map((s) => {
              const out = left(s) <= 0;
              return (
                <label
                  key={s}
                  className={
                    (size === s ? "is-chosen" : "") + (out ? " is-out" : "")
                  }
                >
                  <input
                    type="radio"
                    name={`${id}-size`}
                    value={s}
                    checked={size === s}
                    disabled={out || !onAdd}
                    onChange={() => {
                      setSize(s);
                      setQuantity((q) => Math.min(q, Math.max(1, left(s))));
                      setError("");
                    }}
                  />
                  <span>{s}</span>
                  {out && <small>{t.sizeOut}</small>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <p className="shop-detail-price">
        <span>{mode === "sale" ? t.buyPrice : t.rentPrice}</span>
        <strong>
          {price === null ? dict.shop.askPrice : rupiah(price, locale)}
        </strong>
      </p>
      {onAdd && (
        <div className="shop-detail-actions">
          <label>
            {t.quantity}
            <select
              disabled={blocked}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            >
              {Array.from({ length: Math.max(1, max) }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button dark"
            disabled={blocked}
            onClick={add}
          >
            {t.add}
          </button>
        </div>
      )}
      {error && (
        <p className="activity-error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
