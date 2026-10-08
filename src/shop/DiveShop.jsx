"use client";
import { useEffect, useState, useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import { photoSrcSet } from "../photography.js";
import ProductVisual from "./ProductVisual.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import {
  shopCategories,
  availabilityLabels,
  rupiah,
  quoteOrder,
  orderMessage,
} from "../shop-model.js";

export default function DiveShop({
  shop,
  contact,
  images,
  activities,
  demo,
  initialMode,
  today,
}) {
  const motionRoot = useRef(null);
  const [mode, setMode] = useState(initialMode),
    [category, setCategory] = useState("all"),
    [search, setSearch] = useState("");
  const [cart, setCart] = useState([]),
    [details, setDetails] = useState({
      name: "",
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
        .toLocaleLowerCase("id-ID")
        .includes(search.toLocaleLowerCase("id-ID")),
  );
  const categories = [...new Set(eligible.map((p) => p.category))];
  let quote;
  try {
    if (cart.length) quote = quoteOrder(shop.products, cart, details.days);
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
      setNotice("Maksimal 10 unit per perlengkapan.");
      return;
    }
    changeCart(
      item
        ? cart.map((p) => (p === item ? { ...p, quantity: p.quantity + 1 } : p))
        : [...cart, { id: product.id, mode, quantity: 1 }],
    );
    setNotice(
      `${product.name} ditambahkan untuk ${mode === "sale" ? "dibeli" : "rental"}.`,
    );
  }
  function changeDetails(key, value) {
    setDetails({ ...details, [key]: value });
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      if (hasRental && details.startDate < today)
        throw new Error("Tanggal rental harus hari ini atau setelahnya.");
      setMessage(orderMessage(shop.products, cart, details, demo));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  const helpURL = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Halo Zanclus! Saya ingin bantuan untuk membeli atau menyewa perlengkapan diving.")}`;
  return (
    <div className="shop-page" ref={motionRoot}>
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#catalog">
        Lewati ke katalog
      </a>
      <header className={"site-header" + (scrolled ? " is-scrolled" : "")}>
        <a
          className="brand"
          href="/"
          aria-label="Zanclus Dive Center — Beranda"
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
          aria-label={menu ? "Tutup menu" : "Buka menu"}
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
          aria-label="Navigasi utama"
        >
          <a href="/">Beranda</a>
          <a href="/#experiences">Pengalaman</a>
          <a href="#catalog" className="active" onClick={() => setMenu(false)}>
            Dive Shop
          </a>
          <a href="/#contact">Kontak</a>
        </nav>
        <a
          className="button quick-service"
          href={helpURL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Bantuan alat ↗
        </a>
      </header>
      <main>
        <section className="shop-hero">
          <div className="shop-hero-copy">
            <a className="shop-back" href="/">
              ← Kembali ke laut
            </a>
            <p className="eyebrow">ZANCLUS / DIVE SHOP</p>
            <h1>{shop.heading}</h1>
            <p className="shop-lead">{shop.description}</p>
            <div className="shop-hero-actions">
              <a className="button lime" href="#catalog">
                Pilih perlengkapan ↓
              </a>
              <a
                href="#catalog"
                className="shop-rental-link"
                onClick={() => {
                  setMode("rental");
                  setCategory("all");
                }}
              >
                Cari alat rental ↗
              </a>
            </div>
            <div className="shop-hero-note">
              <span className="tiny-dot" /> Pilih alat. Susun kebutuhan.
              Konfirmasi bersama tim.
            </div>
          </div>
          <div className="shop-hero-art">
            <img
              src={images.shop}
              srcSet={photoSrcSet(images.shop)}
              sizes="(max-width: 700px) 90vw, 420px"
              alt="Visual konsep perlengkapan diving dan snorkeling untuk beli atau rental"
              width="1000"
              height="667"
              fetchPriority="high"
            />
            <span>READY FOR YOUR NEXT DIVE</span>
          </div>
        </section>
        {demo && (
          <div className="shop-demo-note">
            <strong>Mode demo</strong> · Produk dan harga contoh untuk mencoba
            Dive Shop.
          </div>
        )}
        <section
          className="shop-catalog"
          id="catalog"
          aria-labelledby="catalog-title"
        >
          <div className="shop-catalog-top" data-reveal>
            <div>
              <p className="eyebrow">GEAR UP, DIVE IN</p>
              <h2 id="catalog-title">Temukan perlengkapanmu.</h2>
            </div>
            <a className="shop-order-shortcut" href="#order">
              Pesananmu <span>{count}</span> ↓
            </a>
          </div>
          <div className="shop-layout">
            <div className="shop-products-area">
              <div className="shop-controls">
                <div
                  className="shop-mode"
                  role="group"
                  aria-label="Jenis layanan"
                >
                  <button
                    aria-pressed={mode === "sale"}
                    onClick={() => {
                      setMode("sale");
                      setCategory("all");
                    }}
                  >
                    Beli alat
                  </button>
                  <button
                    aria-pressed={mode === "rental"}
                    onClick={() => {
                      setMode("rental");
                      setCategory("all");
                    }}
                  >
                    Rental alat
                  </button>
                </div>
                <label className="shop-search">
                  <span className="sr-only">Cari perlengkapan</span>
                  <input
                    type="search"
                    placeholder="Cari perlengkapan…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="shop-filter-row">
                <p>
                  {products.length} perlengkapan ·{" "}
                  {mode === "sale" ? "untuk dibeli" : "harga per hari"}
                </p>
                <label>
                  <span className="sr-only">Kategori perlengkapan</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">Semua kategori</option>
                    {categories.map((key) => (
                      <option key={key} value={key}>
                        {shopCategories[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="shop-add-notice" role="status">
                {notice || "Pilih alat dan tambahkan ke pesananmu."}
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
                          {availabilityLabels[product.availability]}
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
                            {price === null ? "Minta harga" : rupiah(price)}
                            {mode === "rental" && price !== null && (
                              <small> / hari</small>
                            )}
                          </p>
                          <button
                            disabled={product.availability === "unavailable"}
                            aria-label={`Tambahkan ${product.name} untuk ${mode === "sale" ? "dibeli" : "rental"}`}
                            onClick={() => add(product)}
                          >
                            <span aria-hidden="true">+</span>{" "}
                            {mode === "sale" ? "Beli" : "Sewa"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!products.length && (
                <div className="shop-empty">
                  <h3>Belum ada perlengkapan pada pilihan ini.</h3>
                  <p>
                    Coba kategori lain atau diskusikan kebutuhanmu dengan tim.
                  </p>
                  <a
                    className="button dark"
                    href={helpURL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tanya tim Zanclus ↗
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
              <h2 id="order-title">Pesananmu.</h2>
              <p className="shop-order-intro">
                Gabungkan alat yang ingin dibeli dan disewa dalam satu rencana.
              </p>
              {!cart.length ? (
                <div className="shop-cart-empty">
                  <span aria-hidden="true">＋</span>
                  <p>Petualangan dimulai dari sini.</p>
                  <small>Tambahkan perlengkapan dari katalog.</small>
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
                                {item.mode === "sale" ? "BELI" : "RENTAL"}
                              </span>
                              <h3>{product.name}</h3>
                            </div>
                            <button
                              aria-label={`Hapus ${product.name} ${item.mode === "sale" ? "beli" : "rental"}`}
                              onClick={() =>
                                changeCart(cart.filter((p) => p !== item))
                              }
                            >
                              ×
                            </button>
                          </div>
                          <div className="shop-cart-quantity">
                            <label>
                              Jumlah
                              <select
                                aria-label={`Jumlah ${product.name} ${item.mode === "sale" ? "beli" : "rental"}`}
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
                                ? "Minta harga"
                                : rupiah(line.total)}
                            </strong>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <form className="shop-order-form" onSubmit={prepare}>
                    <label>
                      Nama kamu
                      <input
                        required
                        maxLength={80}
                        autoComplete="name"
                        value={details.name}
                        onChange={(e) => changeDetails("name", e.target.value)}
                      />
                    </label>
                    {hasRental && (
                      <div className="shop-rental-dates">
                        <label>
                          Tanggal mulai rental
                          <input
                            type="date"
                            required
                            min={today}
                            value={details.startDate}
                            onChange={(e) =>
                              changeDetails("startDate", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Durasi (hari)
                          <input
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
                        </label>
                      </div>
                    )}
                    <label>
                      Ukuran / catatan (opsional)
                      <textarea
                        rows={2}
                        maxLength={500}
                        placeholder="Ukuran, lokasi pengambilan, atau kebutuhan lain"
                        value={details.notes}
                        onChange={(e) => changeDetails("notes", e.target.value)}
                      />
                    </label>
                    <div className="shop-total">
                      <span>
                        Estimasi{" "}
                        {quote?.needsQuote ? "harga tercantum" : "total"}
                      </span>
                      <strong>
                        {quote ? rupiah(quote.total) : "Periksa durasi"}
                      </strong>
                    </div>
                    {quote?.needsQuote && (
                      <p className="shop-small">
                        Belum termasuk alat yang perlu penawaran.
                      </p>
                    )}
                    <p className="shop-small">
                      Stok, ukuran, harga final, dan ketentuan rental
                      dikonfirmasi tim melalui WhatsApp.
                    </p>
                    {error && (
                      <p className="shop-error" role="alert">
                        {error}
                      </p>
                    )}
                    <button className="button dark shop-submit" type="submit">
                      Siapkan pesan pesanan ↗
                    </button>
                  </form>
                  {message && (
                    <div className="shop-message" role="status">
                      <h3>Pesanan siap dikonfirmasi.</h3>
                      <details>
                        <summary>Lihat isi pesan</summary>
                        <pre>{message}</pre>
                      </details>
                      <a
                        className="button lime shop-send"
                        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Lanjut ke WhatsApp ↗
                      </a>
                      <p className="shop-small">
                        Tekan kirim di WhatsApp untuk menghubungi tim.
                      </p>
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
              Siap sebelum
              <br />
              masuk ke air.
            </h2>
          </div>
          <div>
            <span>01</span>
            <h3>Pilih alatmu</h3>
            <p>
              Beli perlengkapan sendiri atau sewa untuk perjalanan berikutnya.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Ceritakan rencanamu</h3>
            <p>
              Tentukan jumlah, tanggal rental, dan ukuran yang kamu perlukan.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Konfirmasi bersama tim</h3>
            <p>
              Diskusikan ketersediaan, pembayaran, pengambilan, dan pengembalian
              lewat WhatsApp.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter contact={contact} activities={activities} demo={demo} />
      {count > 0 && (
        <a className="shop-mobile-order" href="#order">
          Lihat pesanan · {count} alat{" "}
          <span>{quote ? rupiah(quote.total) : "Periksa durasi"} ↓</span>
        </a>
      )}
    </div>
  );
}
