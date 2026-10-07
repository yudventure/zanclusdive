"use client";
import { useEffect } from "react";
import { WHATSAPP_NUMBER, WHATSAPP_DISPLAY } from "../src/config.js";
import { initializeWebsite } from "../src/main.js";
export default function HomePage() {
  useEffect(() => initializeWebsite(), []);
  return (
    <>
      <a className="skip-link" href="#main">
        {"Lewati ke konten"}
      </a>
      <div className="page-shell">
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
            <a href="#contact">{"Kontak"}</a>
          </nav>
          <button className="button nav-book" data-book>
            {"Rencanakan dive "}
            <span>{"↗"}</span>
          </button>
        </header>
        <main id="main">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-topline">
              <span className="tiny-dot"></span>
              {" YOUR NEXT STORY STARTS UNDERWATER"}
            </div>
            <h1 id="hero-title">
              {"Di bawah laut,"}
              <br />
              <span>{"cerita dimulai."}</span>
            </h1>
            <div className="hero-bottom">
              <p>
                {"Jelajahi laut. Temukan cerita."}
                <br />
                {"Pengalaman menyelam untuk setiap rasa ingin tahu."}
              </p>
              <button className="button primary" data-book>
                {"Mulai petualanganmu "}
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
                  {"Ada cerita untuk setiap level."}
                </h2>
              </div>
              <button className="button lime small" id="see-all">
                {"Lihat semua "}
                <span>{"↗"}</span>
              </button>
            </div>
            <div className="course-grid">
              <button className="course-card beginner" data-course="beginner">
                <span className="round-arrow">{"↗"}</span>
                <div>
                  <span className="card-kicker">{"LANGKAH PERTAMA"}</span>
                  <h3>{"Mulai menyelam"}</h3>
                  <p>
                    {"Kenali peralatan, persiapan,"}
                    <br />
                    {"dan dunia di bawah permukaan."}
                  </p>
                </div>
              </button>
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
                <small>{"Kalender rencana, bukan ketersediaan booking."}</small>
              </div>
              <button className="course-card advanced" data-course="explorer">
                <span className="round-arrow">{"↗"}</span>
                <div>
                  <span className="card-kicker">{"GO A LITTLE DEEPER"}</span>
                  <h3>{"Jelajah laut"}</h3>
                  <p>
                    {"Temukan perspektif baru"}
                    <br />
                    {"di antara kehidupan laut."}
                  </p>
                </div>
              </button>
              <button className="course-card specialty" data-course="specialty">
                <span className="round-arrow">{"↗"}</span>
                <div>
                  <span className="card-kicker">{"FOLLOW YOUR CURIOSITY"}</span>
                  <h3>{"Pengalaman spesial"}</h3>
                  <p>
                    {"Cerita kecil yang membuat"}
                    <br />
                    {"setiap dive berbeda."}
                  </p>
                </div>
              </button>
            </div>
            <div className="quiz-panel">
              <p className="eyebrow">{"LET'S FIND YOUR NEXT DIVE"}</p>
              <h2>{"Belum tahu mulai dari mana?"}</h2>
              <p>{"Temukan pengalaman yang sesuai denganmu."}</p>
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
                  {"Laut punya cara"}
                  <br />
                  {"untuk membuatmu takjub."}
                </h2>
              </div>
              <p className="section-intro">
                {"Dari warna terumbu hingga tenangnya laut terbuka."}
                <br />
                {"Pelan-pelan, temukan hal yang belum pernah kamu lihat."}
              </p>
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
          <section className="contact-section" id="contact">
            <p className="eyebrow">{"MAKE ROOM FOR A NEW STORY"}</p>
            <h2>
              {"Petualangan berikutnya"}
              <br />
              {"dimulai dari satu langkah."}
            </h2>
            <p>
              {
                "Ceritakan pengalamanmu, pilih tanggal, dan susun rencana penyelaman."
              }
            </p>
            <button className="button primary" data-book>
              {"Rencanakan bersama Zanclus "}
              <span>{"↗"}</span>
            </button>
            <p className="contact-note">
              {"WhatsApp uji coba: "}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {WHATSAPP_DISPLAY}{" ↗"}
              </a>
              <br />
              {
                "Tanggal dan program perlu dikonfirmasi dengan tim sebelum perjalanan."
              }
            </p>
          </section>
        </main>
        <footer>
          <a className="brand" href="#">
            <img
              src="/assets/logo-header-dark.svg"
              alt="Zanclus Dive Center"
              width="160"
              height="40"
            />
          </a>
          <p>{"Jelajahi laut. Temukan cerita."}</p>
          <a href="#main">{"Kembali ke atas ↑"}</a>
          <span>
            {"© "}
            <span id="year"></span>
            {" Zanclus Dive Center"}
          </span>
        </footer>
      </div>
      <dialog id="detail-dialog" className="modal">
        <button className="close-modal" aria-label="Tutup detail">
          {"×"}
        </button>
        <p className="eyebrow">{"YOUR NEXT UNDERWATER STORY"}</p>
        <h2 id="detail-title"></h2>
        <p id="detail-description"></p>
        <ul id="detail-list"></ul>
        <p className="muted">
          {"Program, biaya, dan persyaratan dikonfirmasi bersama tim Zanclus."}
        </p>
        <button className="button dark" id="detail-book">
          {"Rencanakan pengalaman ini ↗"}
        </button>
      </dialog>
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
              <option value="beginner">{"Mulai menyelam"}</option>
              <option value="explorer">{"Jelajah laut"}</option>
              <option value="specialty">{"Pengalaman spesial"}</option>
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
