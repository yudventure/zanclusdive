import ContactIcon from "./ContactIcon.jsx";
import { phoneLabel, socialPlatforms } from "../contact-model.js";

export default function SiteFooter({
  contact,
  tagline = "Jelajahi laut. Temukan cerita.",
  demo = false,
  home = false,
}) {
  const socials = Object.entries(socialPlatforms).filter(
    ([key]) => contact[key],
  );
  const whatsappURL = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Halo Zanclus! Saya ingin informasi tentang diving, perlengkapan, atau rental alat.")}`;
  return (
    <footer className="site-footer" aria-label="Informasi Zanclus Dive Center">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <a href="/" aria-label="Zanclus Dive Center — Beranda">
            <img
              src="/assets/logo-header-dark.svg"
              alt="Zanclus Dive Center"
              width="200"
              height="50"
            />
          </a>
          <p className="site-footer-tagline">{tagline}</p>
          <p className="site-footer-description">
            Pengalaman menyelam dan perlengkapan untuk membawamu lebih dekat
            dengan laut.
          </p>
        </div>
        <section
          className="site-footer-column"
          aria-labelledby="footer-explore-title"
        >
          <h2 id="footer-explore-title">Jelajahi Zanclus</h2>
          <div className="site-footer-links">
            <a href="/#experiences">Pengalaman diving</a>
            <a href="/#ocean">Jelajahi laut</a>
            <a href="/#calendar">Rencanakan dive</a>
            <a href="/dive-shop">Dive Shop</a>
            <a href="/dive-shop?mode=rental#catalog">Rental perlengkapan</a>
          </div>
        </section>
        <section
          className="site-footer-column"
          aria-labelledby="footer-contact-title"
        >
          <h2 id="footer-contact-title">Hubungi kami</h2>
          <a
            className="site-footer-contact"
            href={whatsappURL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ContactIcon name="whatsapp" />
            <span>
              <small>WhatsApp</small>
              {phoneLabel(contact.whatsapp)} <span aria-hidden="true">↗</span>
            </span>
          </a>
          {contact.email && (
            <a className="site-footer-contact" href={`mailto:${contact.email}`}>
              <ContactIcon name="email" />
              <span>
                <small>Email</small>
                {contact.email}
              </span>
            </a>
          )}
          {contact.location && (
            <p className="site-footer-location">
              <ContactIcon name="location" />
              <span>{contact.location}</span>
            </p>
          )}
        </section>
        <section
          className="site-footer-column"
          aria-labelledby="footer-social-title"
        >
          <h2 id="footer-social-title">Ikuti cerita kami</h2>
          <p className="site-footer-description">
            Cerita dari laut, inspirasi dive, dan kabar dari Zanclus.
          </p>
          {socials.length > 0 ? (
            <div className="site-footer-socials">
              {socials.map(([key, platform]) => (
                <a
                  key={key}
                  href={contact[key]}
                  aria-label={platform.label}
                  title={platform.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ContactIcon name={key} />
                </a>
              ))}
            </div>
          ) : (
            <a
              className="site-footer-conversation"
              href={whatsappURL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mulai percakapan ↗
            </a>
          )}
          {demo &&
            socials.some(
              ([key, platform]) => contact[key] === platform.url,
            ) && (
              <small className="site-footer-social-note">
                Tautan platform contoh untuk demo.
              </small>
            )}
        </section>
      </div>
      <div className="site-footer-bottom">
        <p>
          ©{" "}
          <span id={home ? "year" : undefined}>{new Date().getFullYear()}</span>{" "}
          Zanclus Dive Center. All rights reserved.
        </p>
        {demo && (
          <a className="site-footer-demo" href="/admin">
            <span /> Mode demo · CMS ↗
          </a>
        )}
        <a className="site-footer-top" href={home ? "#main" : "#"}>
          Kembali ke atas <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}
