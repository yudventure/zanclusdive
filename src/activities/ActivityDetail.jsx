"use client";
import { useEffect, useState } from "react";
import {
  activityInquiry,
  activityKeys,
  activityLabels,
} from "../activity-model.js";
import ActivityCards from "./ActivityCards.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import { phoneLabel } from "../contact-model.js";

function Inquiry({ activityKey, activity, contact, demo }) {
  const [today, setToday] = useState("");
  const [details, setDetails] = useState({
    name: "",
    date: "",
    participants: 1,
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);
  function change(key, value) {
    setDetails((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }
  function prepare(event) {
    event.preventDefault();
    try {
      setMessage(activityInquiry(activityKey, activity, details, today, demo));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <aside
      className="activity-inquiry"
      id="inquiry"
      aria-labelledby="inquiry-title"
    >
      <p className="eyebrow">LET'S MAKE A PLAN</p>
      <h2 id="inquiry-title">
        Rencanakan {activityLabels[activityKey].toLowerCase()}.
      </h2>
      <div className="activity-price">
        <small>
          {activity.price === null
            ? "BIAYA KEGIATAN"
            : demo
              ? "HARGA CONTOH DEMO / ORANG"
              : "MULAI DARI / ORANG"}
        </small>
        <strong>
          {activity.price === null
            ? "Minta penawaran"
            : new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(activity.price)}
        </strong>
        <p>
          Jadwal, rincian biaya, dan ketersediaan dikonfirmasi melalui WhatsApp.
        </p>
      </div>
      <form className="activity-form" onSubmit={prepare}>
        <label htmlFor="inquiry-name">Nama kamu</label>
        <input
          id="inquiry-name"
          name="name"
          autoComplete="name"
          maxLength={120}
          required
          value={details.name}
          onChange={(e) => change("name", e.target.value)}
          placeholder="Nama lengkap"
        />
        <div className="activity-form-row">
          <div>
            <label htmlFor="inquiry-date">Usulan tanggal</label>
            <input
              id="inquiry-date"
              name="date"
              type="date"
              min={today || undefined}
              required
              value={details.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="inquiry-participants">Jumlah peserta</label>
            <input
              id="inquiry-participants"
              name="participants"
              type="number"
              min="1"
              max="100"
              required
              value={details.participants}
              onChange={(e) => change("participants", e.target.value)}
            />
          </div>
        </div>
        <label htmlFor="inquiry-notes">
          Ceritakan rencanamu <span>(opsional)</span>
        </label>
        <textarea
          id="inquiry-notes"
          name="notes"
          rows="3"
          maxLength={1000}
          value={details.notes}
          onChange={(e) => change("notes", e.target.value)}
          placeholder="Pengalaman di air, pilihan aktivitas, atau kebutuhan kelompok…"
        />
        {error && (
          <p className="activity-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark" type="submit">
          Siapkan pesan WhatsApp <span aria-hidden="true">↗</span>
        </button>
      </form>
      {message && (
        <div className="activity-message" role="status">
          <h3>Pesanmu siap.</h3>
          <p className="activity-message-preview">{message}</p>
          <a
            className="button lime"
            href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Lanjutkan ke WhatsApp <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      <p className="activity-form-note">
        Formulir ini menyiapkan pesan untuk tim. Reservasi berlaku setelah
        dikonfirmasi.
      </p>
      <a
        className="activity-inquiry-contact"
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Halo Zanclus! Saya ingin bertanya tentang ${activityLabels[activityKey]}.`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ContactIcon name="whatsapp" /> Tanya dulu:{" "}
        {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}

export default function ActivityDetail({ activityKey, content, demo }) {
  const activity = content.activities[activityKey];
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const helpURL = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(`Halo Zanclus! Saya ingin bantuan untuk merencanakan ${activityLabels[activityKey]}.`)}`;
  return (
    <div className="activity-page">
      <a className="skip-link" href="#activity-main">
        Lewati ke detail aktivitas
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
          aria-controls="activity-navigation"
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
        </button>
        <nav
          id="activity-navigation"
          className={menu ? "open" : ""}
          aria-label="Navigasi utama"
        >
          <a href="/">Beranda</a>
          {activityKeys
            .filter((key) => content.activities[key].enabled)
            .map((key) => (
              <a
                href={`/${key}`}
                key={key}
                className={key === activityKey ? "active" : ""}
                aria-current={key === activityKey ? "page" : undefined}
                onClick={() => setMenu(false)}
              >
                {activityLabels[key]}
              </a>
            ))}
          <a href="/dive-shop">Dive Shop</a>
          <a href="/#contact">Kontak</a>
        </nav>
        <a
          className="button quick-service"
          href={helpURL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp untuk bantuan cepat"
        >
          <ContactIcon name="whatsapp" />
          <span className="quick-label">
            <span className="quick-prefix">Chat </span>WhatsApp
          </span>
        </a>
      </header>
      <main id="activity-main">
        <section className="activity-hero" aria-labelledby="activity-title">
          <img
            className="activity-hero-photo"
            src={activity.image}
            alt={activity.imageAlt}
            width="1672"
            height="941"
            fetchPriority="high"
          />
          <div className="activity-container activity-hero-content">
            <div className="activity-breadcrumb">
              <a href="/">Beranda</a>
              <span aria-hidden="true">/</span>
              <span>{activityLabels[activityKey]}</span>
            </div>
            <p className="eyebrow">
              ZANCLUS EXPERIENCES / {activityLabels[activityKey].toUpperCase()}
            </p>
            <h1 id="activity-title">{activity.title}</h1>
            <p className="activity-hero-summary">{activity.summary}</p>
            <div className="activity-hero-actions">
              <a className="button primary" href="#inquiry">
                Rencanakan kegiatan <span aria-hidden="true">↗</span>
              </a>
              <a className="activity-text-link" href="#overview">
                Jelajahi detail <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="activity-hero-bottom">
              <span>
                {demo
                  ? "MODE DEMO · CONTOH AKTIVITAS"
                  : "JELAJAHI LAUT. TEMUKAN CERITA."}
              </span>
              <span>{activity.imageAlt}</span>
            </div>
          </div>
        </section>
        <div className="activity-body">
          <div className="activity-container">
            <div className="activity-jump-links" aria-label="Bagian halaman">
              <a href="#overview">Tentang kegiatan</a>
              <a href="#itinerary">Alur kegiatan</a>
              <a href="#preparation">Persiapan</a>
              <a href="#faq">Pertanyaan umum</a>
            </div>
            {demo && (
              <p className="activity-demo-note activity-demo-banner">
                Ini halaman demo. Aktivitas dan alur adalah contoh; jadwal,
                lokasi, serta biaya perlu dikonfirmasi.
              </p>
            )}
            <div className="activity-layout">
              <div className="activity-details">
                <section className="activity-overview" id="overview">
                  <p className="eyebrow">A LITTLE CLOSER TO THE OCEAN</p>
                  <h2>Kenali pengalamanmu.</h2>
                  <p className="activity-description">{activity.description}</p>
                  <dl className="activity-facts">
                    <div>
                      <dt>Untuk siapa</dt>
                      <dd>{activity.audience}</dd>
                    </div>
                    <div>
                      <dt>Durasi</dt>
                      <dd>{activity.duration}</dd>
                    </div>
                    <div>
                      <dt>Titik temu</dt>
                      <dd>{activity.meetingPoint}</dd>
                    </div>
                  </dl>
                  <div className="activity-highlights">
                    {activity.highlights.map((item, index) => (
                      <div key={index}>
                        <span aria-hidden="true">↗</span>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="activity-content-section" id="itinerary">
                  <p className="eyebrow">ONE STEP AT A TIME</p>
                  <h2>
                    {demo ? "Contoh alur kegiatan." : "Rencana aktivitas."}
                  </h2>
                  <p className="activity-section-intro">
                    Susun rincian bersama tim; alur akhir mengikuti program dan
                    kondisi laut.
                  </p>
                  <ol className="activity-timeline">
                    {activity.itinerary.map((step, index) => (
                      <li key={index}>
                        <span
                          className="activity-step-number"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="activity-content-section" id="preparation">
                  <p className="eyebrow">COME PREPARED, ENJOY MORE</p>
                  <h2>Persiapan sebelum berangkat.</h2>
                  <ul className="activity-preparations">
                    {activity.preparations.map((item, index) => (
                      <li key={index}>
                        <span aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    className="activity-equipment-link"
                    href="/dive-shop?mode=rental#catalog"
                  >
                    <span>
                      Butuh perlengkapan?
                      <strong>Lihat pilihan rental di Dive Shop</strong>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </section>
                <section className="activity-content-section" id="faq">
                  <p className="eyebrow">GOOD TO KNOW</p>
                  <h2>Sebelum kamu bertanya.</h2>
                  <div className="activity-faqs">
                    {activity.faqs.map((item, index) => (
                      <details key={index}>
                        <summary>
                          {item.question}
                          <span aria-hidden="true">+</span>
                        </summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              </div>
              <Inquiry
                activityKey={activityKey}
                activity={activity}
                contact={content.contact}
                demo={demo}
              />
            </div>
          </div>
        </div>
        <ActivityCards
          activities={content.activities}
          exclude={activityKey}
          demo={demo}
        />
      </main>
      <SiteFooter
        contact={content.contact}
        activities={content.activities}
        tagline={content.text.tagline}
        demo={demo}
      />
    </div>
  );
}
