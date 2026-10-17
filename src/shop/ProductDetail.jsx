"use client";
import { useEffect, useId, useRef, useState } from "react";
import ProductVisual from "./ProductVisual.jsx";
import { rupiah, unitsLeft, stockBadge, productImages } from "../shop-model.js";
import { storyBlocks } from "../product-story.js";
import ProductStory from "./ProductStory.jsx";
import { dictionary } from "../i18n.js";
import { videoSource } from "../gallery.js";
import { Video } from "../components/DiveVideos.jsx";

// One Dive Shop product in a window, like a marketplace listing, opened
// from its card or a cart line: the photos with thumbnails, the price and
// what is left, sizes, how the order is received, then the full
// description, the spec table and the videos. From a card the guest picks
// a size and a quantity and adds it; from the cart the window only shows
// the details.
export default function ProductDetail({
  product,
  mode,
  stock,
  locale,
  category,
  delivery,
  onAdd,
  onClose,
}) {
  const ref = useRef(null);
  const id = useId();
  const dict = dictionary(locale);
  const t = dict.shop.detail;
  const d = dict.shop.delivery;
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(0);
  const swipe = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  const sizes = product.sizes ?? [];
  // The photos of the units for sale, or of the units for rent.
  const images = productImages(product, mode);
  const videos = (product.videos ?? [])
    .map((url) => videoSource(url))
    .filter((source) => source && !source.short);
  // The full description, from its Markdown.
  const blocks = storyBlocks(product.details);
  const specs = [
    ...(product.specification
      ? [{ label: t.summary, value: product.specification }]
      : []),
    ...(product.specs ?? []),
  ];
  const left = (s) => unitsLeft(product, stock, mode, s) ?? 10;
  const max = sizes.length && !size ? 10 : left(size);
  // Nothing left of the product, or of the size picked.
  const blocked = (!sizes.length || Boolean(size)) && max <= 0;
  const price = product[mode === "sale" ? "salePrice" : "rentalPrice"];
  const other =
    mode === "sale"
      ? product.rentalEnabled && product.rentalPrice !== null
        ? t.alsoRent(rupiah(product.rentalPrice, locale))
        : ""
      : product.saleEnabled && product.salePrice !== null
        ? t.alsoBuy(rupiah(product.salePrice, locale))
        : "";
  const badge = stockBadge(product, stock, mode, dict.availability);
  const zones = delivery?.enabled ? delivery.zones : [];
  const cheapest = zones.length ? Math.min(...zones.map((z) => z.fee)) : null;
  const close = () => ref.current?.close();
  const show = (n) => setPhoto((n + images.length) % images.length);
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
      <div className="shop-detail-main">
        <div className="shop-detail-gallery">
          <div
            className="shop-detail-visual"
            onPointerDown={(e) => (swipe.current = e.clientX)}
            onPointerUp={(e) => {
              // A sideways swipe on a phone moves between the photos.
              const moved = e.clientX - (swipe.current ?? e.clientX);
              swipe.current = null;
              if (images.length > 1 && Math.abs(moved) > 40)
                show(photo + (moved < 0 ? 1 : -1));
            }}
          >
            {images.length ? (
              <img
                src={images[photo]}
                alt={`${product.name}, ${t.photo(photo + 1, images.length)}`}
                draggable={false}
              />
            ) : (
              <ProductVisual
                product={{ ...product, image: "" }}
                locale={locale}
              />
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="shop-detail-step is-prev"
                  aria-label={t.prev}
                  onClick={() => show(photo - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="shop-detail-step is-next"
                  aria-label={t.next}
                  onClick={() => show(photo + 1)}
                >
                  ›
                </button>
                <span className="shop-detail-count" aria-hidden="true">
                  {photo + 1}/{images.length}
                </span>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="shop-detail-thumbs">
              {images.map((src, index) => (
                <button
                  type="button"
                  key={src}
                  className={index === photo ? "is-shown" : ""}
                  aria-label={t.photo(index + 1, images.length)}
                  aria-pressed={index === photo}
                  onClick={() => setPhoto(index)}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="shop-detail-info">
          <p className="eyebrow">{category}</p>
          <h2 id={`${id}-title`}>{product.name}</h2>
          <p className="shop-detail-price">
            <span>{mode === "sale" ? t.buyPrice : t.rentPrice}</span>
            <strong>
              {price === null ? dict.shop.askPrice : rupiah(price, locale)}
            </strong>
            {other && <small>{other}</small>}
          </p>
          <span className={"shop-stock stock-" + badge.state}>
            {badge.label}
          </span>
          <p className="shop-detail-text">{product.description}</p>
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
          {delivery && (
            <div className="shop-detail-delivery">
              <h3>{t.delivery}</h3>
              {delivery.pickup && (
                <p>
                  <strong>{d.pickupOnly}</strong>
                  <span>{delivery.pickupNote?.[locale] || ""}</span>
                </p>
              )}
              {cheapest !== null && (
                <p>
                  <strong>
                    {cheapest === 0
                      ? d.freeFrom
                      : d.from(rupiah(cheapest, locale))}
                  </strong>
                  <span>
                    {zones
                      .map(
                        (z) =>
                          `${z.name} ${z.fee ? rupiah(z.fee, locale) : d.free}`,
                      )
                      .join(", ")}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {(blocks.length > 0 || specs.length > 0 || videos.length > 0) && (
        // The story on the left and the spec table beside it on wide
        // screens; the videos under the story.
        <div
          className={
            "shop-detail-more" +
            (specs.length && (blocks.length || videos.length)
              ? " has-side"
              : "")
          }
        >
          {blocks.length > 0 && (
            <section className="shop-detail-story">
              <h3>{t.description}</h3>
              <ProductStory blocks={blocks} />
            </section>
          )}
          {specs.length > 0 && (
            <section className="shop-detail-side">
              <h3>{t.specs}</h3>
              <dl className="shop-detail-specs">
                {specs.map((row, index) => (
                  <div key={index}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {videos.length > 0 && (
            <section className="shop-detail-watch">
              <h3>{t.videos}</h3>
              <ul className="dive-videos shop-detail-videos">
                {videos.map((source, index) => (
                  <Video
                    key={source.platform + source.id}
                    source={source}
                    name={t.video(product.name, index + 1)}
                    t={dict.gallery}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </dialog>
  );
}
