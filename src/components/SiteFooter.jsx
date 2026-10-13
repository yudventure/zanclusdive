import ContactIcon from "./ContactIcon.jsx";
import { phoneLabel, socialPlatforms } from "../contact-model.js";
import { defaultActivities, activityKeys } from "../activity-model.js";
import { dictionary, localeHref } from "../i18n.js";

export default function SiteFooter({
  contact,
  tagline,
  home = false,
  activities = defaultActivities,
  locale = "en",
}) {
  const t = dictionary(locale).footer;
  const labels = dictionary(locale).activityLabels;
  const href = (path) => localeHref(locale, path);
  const socials = Object.entries(socialPlatforms).filter(
    ([key]) => contact[key],
  );
  const whatsappURL = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(t.whatsapp)}`;
  return (
    <footer className="site-footer" aria-label={t.label}>
      <div className="site-footer-grid" data-reveal="fade">
        <div className="site-footer-brand">
          <a href={href("/")} aria-label={dictionary(locale).common.homeLabel}>
            <img
              src="/assets/logo-header-dark.svg"
              alt="Zanclus Dive Center"
              width="200"
              height="50"
            />
          </a>
          <p className="site-footer-tagline">{tagline || t.tagline}</p>
          <p className="site-footer-description">{t.description}</p>
        </div>
        <section
          className="site-footer-column"
          aria-labelledby="footer-explore-title"
        >
          <h2 id="footer-explore-title">{t.explore}</h2>
          <div className="site-footer-links">
            {activityKeys
              .filter((key) => activities[key].enabled)
              .map((key) => (
                <a key={key} href={href(`/${key}`)}>
                  {labels[key]}
                </a>
              ))}
            <a href={href("/course")}>{dictionary(locale).course.nav}</a>
            <a href={href("/dive-shop")}>Dive Shop</a>
            <a href={href("/dive-shop?mode=rental#catalog")}>{t.rental}</a>
            <a href={href("/service")}>{dictionary(locale).service.nav}</a>
            <a href={href("/about")}>{dictionary(locale).about.nav}</a>
          </div>
        </section>
        <section
          className="site-footer-column"
          aria-labelledby="footer-contact-title"
        >
          <h2 id="footer-contact-title">{t.contact}</h2>
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
          <h2 id="footer-social-title">{t.follow}</h2>
          <p className="site-footer-description">{t.followDescription}</p>
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
              {t.startChat}
            </a>
          )}
        </section>
      </div>
      <div className="site-footer-bottom">
        <p>
          ©{" "}
          <span id={home ? "year" : undefined}>{new Date().getFullYear()}</span>{" "}
          {t.rights}
        </p>
        <a className="site-footer-operator" href="/admin" rel="nofollow">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="5"
              y="10.5"
              width="14"
              height="9.5"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {t.operator}
        </a>
      </div>
    </footer>
  );
}
