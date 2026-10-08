import ProductVisual from "./ProductVisual.jsx";
import { rupiah } from "../shop-model.js";

export default function ShopTeaser({ shop, demo }) {
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
          <a className="button dark" href="/dive-shop">
            Jelajahi Dive Shop ↗
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
              href={`/dive-shop?mode=${product.saleEnabled ? "sale" : "rental"}#catalog`}
              key={product.id}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` }}
            >
              <ProductVisual product={product} />
              <div>
                <span>
                  {product.saleEnabled && product.rentalEnabled
                    ? "BELI / RENTAL"
                    : product.saleEnabled
                      ? "BELI"
                      : "RENTAL"}
                </span>
                <h3>{product.name}</h3>
                <p>
                  {price === null
                    ? "Minta penawaran"
                    : rupiah(price) + (product.saleEnabled ? "" : " / hari")}
                </p>
              </div>
              <span className="shop-teaser-arrow">↗</span>
            </a>
          );
        })}
        {!products.length && (
          <p className="shop-empty">
            Katalog sedang disiapkan. Hubungi tim Zanclus melalui Dive Shop
            untuk kebutuhan alatmu.
          </p>
        )}
      </div>
      <div className="shop-teaser-bottom">
        <span>01 / Beli perlengkapan</span>
        <span>02 / Rental harian</span>
        <span>03 / Konfirmasi bersama tim</span>
        {demo && <small>Produk & harga contoh demo</small>}
      </div>
    </section>
  );
}
