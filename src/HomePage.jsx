"use client";
import { useEffect } from "react";
import { initializeWebsite } from "./main.js";
import ShopTeaser from "./shop/ShopTeaser.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import ContactIcon from "./components/ContactIcon.jsx";
import { activityLabels } from "./activity-model.js";

function ExperienceCard({ activityKey, activity, className, kicker }) {
  return (
    <a
      className={`course-card ${className}`}
      data-activity={activityKey}
      href={`/${activityKey}`}
      hidden={!activity.enabled}
      aria-label={`Lihat detail ${activityLabels[activityKey]}`}
      style={{ backgroundImage: `url(${JSON.stringify(activity.image)})` }}
    >
      <span className="round-arrow" aria-hidden="true">
        ↗
      </span>
      <div>
        <span className="card-kicker">{kicker}</span>
        <h3>{activityLabels[activityKey]}</h3>
        <small className="course-price">
          {activity.price === null
            ? "Biaya sesuai penawaran"
            : `Mulai ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(activity.price)}`}
        </small>
        <small className="course-price course-duration">
          {activity.duration}
        </small>
        <p>{activity.summary}</p>
        <span className="course-card-cta">
          Lihat detail <span aria-hidden="true">↗</span>
        </span>
      </div>
    </a>
  );
}
export default function HomePage({ content, demo = false }) {
  const WHATSAPP_NUMBER = content.contact.whatsapp;
  const WHATSAPP_DISPLAY = WHATSAPP_NUMBER.startsWith("62")
    ? "0" + WHATSAPP_NUMBER.slice(2)
    : "+" + WHATSAPP_NUMBER;
  useEffect(() => initializeWebsite(content), [content]);
  return (
    <>
      <a className="skip-link" href="#main">
        {"Lewati ke konten"}
      </a>
      <div
        className="page-shell"
        style={{
          "--hero-image": `url(${JSON.stringify(content.images.hero)})`,
          "--reef-image": `url(${JSON.stringify(content.images.reef)})`,
          "--ocean-image": `url(${JSON.stringify(content.images.ocean)})`,
        }}
      >
        <header className="site-header">
          <a
            className="brand"
            href="#"
            aria-label="Zanclus Dive Center — Beranda"
          >
            <img
              src="/assets/logo-header-dark.svg"
              alt="Zanclus Dive Center"
              width="160"
              height="40"
            />
          </a>
          <button
            className="menu-toggle"
            aria-label="Buka menu"
            aria-expanded="false"
            aria-controls="navigation"
          >
            <span></span>
            <span></span>
          </button>
          <nav id="navigation" aria-label="Navigasi utama">
            <a href="#" className="active">
              {"Beranda"}
            </a>
            <a href="#experiences">{"Pengalaman"}</a>
            <a href="#ocean">{"Jelajahi laut"}</a>
            <a href="#calendar">{"Rencana"}</a>
            <a href="/dive-shop">{"Dive Shop"}</a>
            <a href="#contact">{"Kontak"}</a>
          </nav>
          <a
            className="button quick-service"
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Halo Zanclus! Saya ingin mendapat bantuan tentang pengalaman diving dan jadwal yang tersedia.")}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat WhatsApp untuk bantuan cepat"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.5-4.7A8.5 8.5 0 1 1 20.5 11.6Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M8.3 7.5c-.6.3-.8 1.1-.5 2 .8 2.3 2.5 4 4.8 4.9.9.3 1.7.1 2-.5l.6-1.1-2-1-.8.9a6.2 6.2 0 0 1-2.8-2.8l.9-.8-1-2-1.2.4Z"
                fill="currentColor"
              />
            </svg>
            <span className="quick-label">
              <span className="quick-prefix">Chat </span>WhatsApp
            </span>
          </a>
        </header>
        <main id="main">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-topline">
              <span className="tiny-dot"></span>
              {content.text.heroEyebrow}
            </div>
            <h1 id="hero-title">
              {content.text.heroTitle1}
              <br />
              <span>{content.text.heroTitle2}</span>
            </h1>
            <div className="hero-bottom">
              <p>
                {content.text.tagline}
                <br />
                {content.text.heroDescription}
              </p>
              <button className="button primary" data-book>
                {content.text.heroButton}
                <span>{"↗"}</span>
              </button>
            </div>
            <div className="hero-caption">
              <span>{"01 — THE OCEAN IS CALLING"}</span>
              <a href="#experiences" aria-label="Jelajahi pengalaman">
                {"SCROLL TO EXPLORE "}
                <span>{"↓"}</span>
              </a>
            </div>
          </section>
          <section
            className="experiences light-panel"
            id="experiences"
            aria-labelledby="experiences-title"
          >
            <div className="section-heading flex items-center justify-between gap-5">
              <div>
                <p className="eyebrow">{"FIND YOUR KIND OF ADVENTURE"}</p>
                <h2 id="experiences-title">
                  {content.text.experiencesHeading}
                </h2>
              </div>
              <button className="button lime small" id="see-all">
                {"Lihat semua "}
                <span>{"↗"}</span>
              </button>
            </div>
            <div
              className="course-grid"
              data-visible-activities={
                Object.values(content.activities).filter(
                  (activity) => activity.enabled,
                ).length
              }
              style={{
                "--course-columns": [
                  content.activities.diving.enabled ? "2.37fr" : "1.12fr",
                  ...(content.activities.snorkeling.enabled ? ["0.85fr"] : []),
                  ...(content.activities.trip.enabled ? ["0.85fr"] : []),
                ].join(" "),
              }}
            >
              <article
                className="beginner-calendar"
                aria-label="Diving dan kalender rencana"
              >
                <ExperienceCard
                  activityKey="diving"
                  activity={content.activities.diving}
                  className="beginner"
                  kicker="SELAMI CERITA BARU"
                />
                <div className="calendar-card" id="calendar">
                  <div className="calendar-heading">
                    <button id="prev-month" aria-label="Bulan sebelumnya">
                      {"‹"}
                    </button>
                    <h3 id="month-label"></h3>
                    <button id="next-month" aria-label="Bulan berikutnya">
                      {"›"}
                    </button>
                  </div>
                  <div className="weekday-row" aria-hidden="true">
                    <span>{"S"}</span>
                    <span>{"S"}</span>
                    <span>{"R"}</span>
                    <span>{"K"}</span>
                    <span>{"J"}</span>
                    <span>{"S"}</span>
                    <span>{"M"}</span>
                  </div>
                  <div
                    id="calendar-grid"
                    className="calendar-grid"
                    role="group"
                    aria-label="Pilih tanggal rencana diving"
                  ></div>
                  <p
                    className="calendar-note"
                    id="calendar-note"
                    aria-live="polite"
                  >
                    {"Pilih tanggal petualanganmu."}
                  </p>
                  <small>
                    {"Kalender rencana, bukan ketersediaan booking."}
                  </small>
                </div>
              </article>
              <ExperienceCard
                activityKey="snorkeling"
                activity={content.activities.snorkeling}
                className="advanced"
                kicker="DEKAT DENGAN LAUT"
              />
              <ExperienceCard
                activityKey="trip"
                activity={content.activities.trip}
                className="specialty"
                kicker="JELAJAH BERSAMA"
              />
            </div>
            <div className="quiz-panel">
              <p className="eyebrow">{"LET'S FIND YOUR NEXT DIVE"}</p>
              <h2>{content.text.quizTitle}</h2>
              <p>{content.text.quizDescription}</p>
              <button className="button quiz-button" id="open-quiz">
                {"Temukan pilihanmu "}
                <span>{"↗"}</span>
              </button>
              <div className="photo-fan" aria-hidden="true">
                <div className="fan-photo photo-one"></div>
                <div className="fan-photo photo-two"></div>
                <div className="fan-photo photo-three"></div>
                <div className="fan-photo photo-four"></div>
                <div className="fan-photo photo-five"></div>
              </div>
            </div>
            <div id="more-courses" className="more-courses" hidden>
              <p>
                {
                  "Setiap pengalaman disesuaikan dengan kemampuan dan kondisi laut. Pilih kartu untuk melihat detail, lalu diskusikan rencanamu dengan tim Zanclus."
                }
              </p>
              <button className="button dark" data-book>
                {"Susun rencana dive "}
                <span>{"↗"}</span>
              </button>
            </div>
          </section>
          <section className="ocean-section" id="ocean">
            <div className="section-heading flex items-center justify-between gap-5">
              <div>
                <p className="eyebrow">{"A DIFFERENT WORLD, JUST BELOW"}</p>
                <h2>
                  {content.text.oceanTitle1}
                  <br />
                  {content.text.oceanTitle2}
                </h2>
              </div>
              <p className="section-intro">{content.text.oceanDescription}</p>
            </div>
            <div className="ocean-grid">
              <article className="ocean-card reef-card">
                <span>{"01 / KEHIDUPAN LAUT"}</span>
                <h3>
                  {"Warna yang"}
                  <br />
                  {"tak pernah biasa."}
                </h3>
              </article>
              <article className="ocean-card open-card">
                <span>{"02 / RUANG UNTUK MENJELAJAH"}</span>
                <h3>
                  {"Lebih dekat"}
                  <br />
                  {"dengan laut."}
                </h3>
              </article>
            </div>
          </section>
          <ShopTeaser shop={content.shop} demo={demo} />
          <section
            className="contact-section"
            id="contact"
            aria-labelledby="contact-title"
          >
            <div className="contact-copy">
              <p className="eyebrow">{"MAKE ROOM FOR A NEW STORY"}</p>
              <h2 id="contact-title">
                {content.text.contactTitle1}
                <br />
                {content.text.contactTitle2}
              </h2>
              <p className="contact-description">
                {content.text.contactDescription}
              </p>
              <div className="contact-actions">
                <button className="button dark" data-book>
                  {"Rencanakan bersama Zanclus "}
                  <span>{"↗"}</span>
                </button>
                <a
                  className="contact-chat"
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Halo Zanclus! Saya ingin berdiskusi tentang rencana diving saya.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chat dulu dengan tim <span aria-hidden="true">↗</span>
                </a>
              </div>
              <p className="contact-note">
                {
                  "Tanggal dan program perlu dikonfirmasi dengan tim sebelum perjalanan."
                }
              </p>
            </div>
            <div className="contact-panel">
              <p className="contact-panel-label">
                <span /> LET'S TALK ABOUT YOUR NEXT DIVE
              </p>
              <h3>Tim Zanclus siap membantu.</h3>
              <p>
                Mulai dari pertanyaan sederhana. Kita susun rencana yang sesuai
                denganmu.
              </p>
              <a
                className="contact-channel"
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Halo Zanclus! Saya ingin informasi tentang diving dan perlengkapan.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-channel-icon">
                  <ContactIcon name="whatsapp" />
                </span>
                <span>
                  <small>WHATSAPP</small>
                  <strong>{WHATSAPP_DISPLAY}</strong>
                </span>
                <span className="contact-channel-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
              {content.contact.email && (
                <a
                  className="contact-channel"
                  href={`mailto:${content.contact.email}`}
                >
                  <span className="contact-channel-icon">
                    <ContactIcon name="email" />
                  </span>
                  <span>
                    <small>EMAIL</small>
                    <strong>{content.contact.email}</strong>
                  </span>
                  <span className="contact-channel-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              )}
              <p className="contact-panel-note">
                Diving · Snorkeling · Trip · Perlengkapan
              </p>
            </div>
          </section>
        </main>
        <SiteFooter
          contact={content.contact}
          activities={content.activities}
          tagline={content.text.tagline}
          demo={demo}
          home
        />
      </div>
      <dialog id="quiz-dialog" className="modal">
        <button className="close-modal" aria-label="Tutup kuis">
          {"×"}
        </button>
        <p className="eyebrow">{"FIND YOUR NEXT DIVE"}</p>
        <div id="quiz-content"></div>
      </dialog>
      <dialog id="booking-dialog" className="modal booking-modal">
        <button className="close-modal" aria-label="Tutup formulir">
          {"×"}
        </button>
        <p className="eyebrow">{"LET'S PLAN SOMETHING GOOD"}</p>
        <h2>{"Rencana penyelamanmu."}</h2>
        <p className="muted">
          {
            "Isi rencana diving, lalu lanjutkan ke WhatsApp untuk mendiskusikannya dengan tim Zanclus."
          }
        </p>
        <form id="booking-form">
          <label>
            {"Nama"}
            <input
              name="name"
              autoComplete="name"
              required
              maxLength="80"
              placeholder="Nama kamu"
            />
          </label>
          <div className="form-row grid grid-cols-2 gap-4">
            <label>
              {"Tanggal rencana"}
              <input type="date" name="date" required />
            </label>
            <label>
              {"Jumlah peserta"}
              <input
                type="number"
                name="people"
                defaultValue="1"
                min="1"
                max="30"
                required
              />
            </label>
          </div>
          <label>
            {"Pengalaman yang diminati"}
            <select name="experience">
              {Object.entries(content.experiences)
                .filter(([, e]) => e.enabled)
                .map(([key, e]) => (
                  <option key={key} value={key}>
                    {e.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {"Ceritakan sedikit tentangmu"}
            <textarea
              name="notes"
              rows="3"
              maxLength="1000"
              placeholder="Pengalaman diving, pertanyaan, atau kebutuhan lainnya"
            ></textarea>
          </label>
          <button className="button dark" type="submit">
            {"Siapkan pesan WhatsApp "}
            <span>{"↗"}</span>
          </button>
        </form>
        <div id="booking-result" hidden aria-live="polite">
          <h3>{"Rencanamu sudah siap."}</h3>
          <p id="booking-summary"></p>
          <p className="muted">
            {
              "Kirim rencana melalui WhatsApp untuk konfirmasi jadwal dan program. Pesan baru dikirim setelah kamu menekan kirim di WhatsApp."
            }
          </p>
          <a
            className="button dark"
            id="send-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            {"Lanjut ke WhatsApp ↗"}
          </a>
          <button className="button primary" id="download-plan">
            {"Unduh rencana ↓"}
          </button>
          <button className="text-button" id="edit-plan">
            {"Ubah rencana"}
          </button>
        </div>
      </dialog>
    </>
  );
}
