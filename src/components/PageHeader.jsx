"use client";
import { useEffect, useState } from "react";
import LanguageSwitch from "./LanguageSwitch.jsx";
import SiteNavLinks from "./SiteNavLinks.jsx";
import ContactIcon from "./ContactIcon.jsx";
import { dictionary, localeHref } from "../i18n.js";

// Header of the About and gear service pages: logo, the shared main menu,
// language switch and a WhatsApp shortcut with a page-specific message.
export default function PageHeader({
  locale,
  page,
  path,
  activities,
  whatsapp,
  message,
}) {
  const dict = dictionary(locale);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  return (
    <header className={"site-header" + (scrolled ? " is-scrolled" : "")}>
      <a
        className="brand"
        href={localeHref(locale, "/")}
        aria-label={dict.common.homeLabel}
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
        aria-label={menu ? dict.common.closeMenu : dict.common.openMenu}
        aria-expanded={menu}
        aria-controls={page + "-navigation"}
        onClick={() => setMenu(!menu)}
      >
        <span />
        <span />
      </button>
      <nav
        id={page + "-navigation"}
        className={menu ? "open" : ""}
        aria-label={dict.common.mainNav}
      >
        <SiteNavLinks
          locale={locale}
          page={page}
          activities={activities}
          onNavigate={() => setMenu(false)}
        />
      </nav>
      <div className="header-actions">
        <LanguageSwitch locale={locale} path={path} />
        <a
          className="button quick-service"
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={dict.common.quickChat}
        >
          <ContactIcon name="whatsapp" />
          <span className="quick-label">
            <span className="quick-prefix">Chat </span>WhatsApp
          </span>
        </a>
      </div>
    </header>
  );
}
