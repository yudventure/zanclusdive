import ProductVisual from "./ProductVisual.jsx";
import { rupiah } from "../shop-model.js";
import { dictionary, localeHref } from "../i18n.js";

export default function ShopTeaser({ shop, demo, locale = "en" }) {
  const t = dictionary(locale).shop;
  const products = shop.products.filter((p) => p.enabled).slice(0, 3);
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
      <div className="shop-teaser-grid">
        {products.map((product, index) => {
          const price = product.saleEnabled
            ? product.salePrice
            : product.rentalPrice;
          return (
            <a
              className="shop-teaser-product"
              href={localeHref(
                locale,
                `/dive-shop?mode=${product.saleEnabled ? "sale" : "rental"}#catalog`,
              )}
              key={product.id}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` }}
            >
              <ProductVisual product={product} />
              <div>
                <span>
                  {product.saleEnabled && product.rentalEnabled
                    ? t.saleRental
                    : product.saleEnabled
                      ? t.saleTag
                      : t.rentalTag}
                </span>
                <h3>{product.name}</h3>
                <p>
                  {price === null
                    ? dictionary(locale).common.requestQuote
                    : rupiah(price, locale) +
                      (product.saleEnabled ? "" : t.perDay)}
                </p>
              </div>
              <span className="shop-teaser-arrow">↗</span>
            </a>
          );
        })}
        {!products.length && <p className="shop-empty">{t.teaserEmpty}</p>}
      </div>
      <div className="shop-teaser-bottom">
        {t.teaserSteps.map((step) => (
          <span key={step}>{step}</span>
        ))}
        {demo && <small>{t.teaserDemo}</small>}
      </div>
    </section>
  );
}
