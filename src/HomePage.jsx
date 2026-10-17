"use client";
import { useEffect, useRef, useState } from "react";
import SiteNavLinks from "./components/SiteNavLinks.jsx";
import PartnerMarquee from "./course/PartnerMarquee.jsx";
import { initializeWebsite } from "./main.js";
import ShopTeaser from "./shop/ShopTeaser.jsx";
import TravelRoute from "./components/TravelRoute.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import ContactIcon from "./components/ContactIcon.jsx";
import ScrollEffects from "./components/ScrollEffects.jsx";
import HeroWeather from "./components/HeroWeather.jsx";
import PricePanel from "./components/PricePanel.jsx";
import DiveSiteMap from "./components/DiveSiteMap.jsx";
import DiveGallery from "./components/DiveGallery.jsx";
import DiveVideos from "./components/DiveVideos.jsx";
import EventBanners from "./components/EventBanner.jsx";
import LanguageSwitch from "./components/LanguageSwitch.jsx";
import { photoSrcSet } from "./photography.js";
import { defaultMapQuery } from "./contact-model.js";
import { withService } from "./service-model.js";
import { dictionary, formatIDR, localeHref } from "./i18n.js";
import { LockedSection, LockedBadge } from "./components/Locked.jsx";
import { noLocks, pageLocked, sectionLocked } from "./developer.js";

function ExperienceCard({
  activityKey,
  activity,
  className,
  kicker,
  locale,
  locked,
}) {
  const t = dictionary(locale);
  const label = t.activityLabels[activityKey];
  // A page locked in developer mode keeps its card, marked and not a link.
  const Card = locked ? "div" : "a";
  return (
    <Card
      className={`course-card ${className}${locked ? " is-locked" : ""}`}
      data-activity={activityKey}
      {...(locked
        ? {}
        : {
            href: localeHref(locale, `/${activityKey}`),
            "aria-label": t.common.viewDetailOf(label),
          })}
    >
      {locked && <LockedBadge locale={locale} />}
      <img
        className="course-photo"
        data-depth
        src={activity.cardImage}
        srcSet={photoSrcSet(activity.cardImage)}
        sizes={
          activityKey === "diving"
            ? "(max-width: 700px) 90vw, 35vw"
            : "(max-width: 700px) 45vw, 24vw"
        }
        alt={activity.cardImageAlt}
        width="900"
        height="600"
        loading="lazy"
      />
      <span className="round-arrow" aria-hidden="true">
        ↗
      </span>
      <div>
        <span className="card-kicker">{kicker}</span>
        <h3>{label}</h3>
        <small className="course-price">
          {activity.price === null
            ? t.common.priceOnQuote
            : t.common.priceFrom(formatIDR(activity.price, locale))}
        </small>
        <small className="course-price course-duration">
          {activity.duration}
        </small>
        <p>{activity.summary}</p>
        <span className="course-card-cta">
          {t.common.viewDetail} <span aria-hidden="true">↗</span>
        </span>
      </div>
    </Card>
  );
}
export default function HomePage({
  content,
  locale = "en",
  locks = noLocks,
  payments,
  banners = [],
  stock = {},
}) {
  const motionRoot = useRef(null);
  const t = dictionary(locale);
  const h = t.home;
  const visibleActivities = ["diving", "snorkeling", "trip"].filter(
    (key) => content.activities[key].enabled,
  );
  const [openActivity, setOpenActivity] = useState(null);
  // Hover opens items only in the side-by-side layout; stacked layouts and
  // touch screens use the "see prices" buttons, avoiding layout jumps.
  const hoverLayout = () =>
    window.matchMedia("(hover: hover) and (min-width: 861px)").matches;
  const kickers = {
    diving: h.divingKicker,
    snorkeling: h.snorkelingKicker,
    trip: h.tripKicker,
  };
  const cardClasses = {
    diving: "beginner",
    snorkeling: "advanced",
    trip: "specialty",
  };
  const WHATSAPP_NUMBER = content.contact.whatsapp;
  const WHATSAPP_DISPLAY = WHATSAPP_NUMBER.startsWith("62")
    ? "0" + WHATSAPP_NUMBER.slice(2)
    : "+" + WHATSAPP_NUMBER;
  const storeAddress = content.contact.location || h.storeDefaultAddress;
  const mapQuery = content.contact.mapQuery || defaultMapQuery;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  useEffect(() => initializeWebsite(content, locale), [content, locale]);
  return (
    <>
      <a className="skip-link" href="#main">
        {t.common.skipToContent}
      </a>
      <div
        className="page-shell"
        ref={motionRoot}
        style={{
          "--hero-image": `url(${JSON.stringify(content.images.hero)})`,
          "--reef-image": `url(${JSON.stringify(content.images.reef)})`,
          "--ocean-image": `url(${JSON.stringify(content.images.ocean)})`,
        }}
      >
        <ScrollEffects rootRef={motionRoot} />
        <header className="site-header">
          <a className="brand" href="#" aria-label={t.common.homeLabel}>
            <img
              src="/assets/logo-header-dark.svg"
              alt="Zanclus Dive Center"
              width="160"
              height="40"
            />
          </a>
          <button
            className="menu-toggle"
            aria-label={t.common.openMenu}
            aria-expanded="false"
            aria-controls="navigation"
          >
            <span></span>
            <span></span>
          </button>
          <nav id="navigation" aria-label={t.common.mainNav}>
            <SiteNavLinks
              locale={locale}
              page="home"
              activities={content.activities}
            />
          </nav>
          <div className="header-actions">
            <LanguageSwitch locale={locale} path="/" />
            <a
              className="button quick-service"
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsappHelp)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.common.quickChat}
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
          </div>
        </header>
        <main id="main">
          <section className="hero" aria-labelledby="hero-title" data-parallax>
            <img
              className="hero-photo"
              src={content.images.hero}
              alt={h.heroAlt}
              width="1672"
              height="941"
              fetchPriority="high"
            />
            <div className="hero-content">
              <p className="hero-topline">{content.text.heroEyebrow}</p>
              <h1 id="hero-title">
                {content.text.heroTitle1}
                <br />
                <span>{content.text.heroTitle2}</span>
              </h1>
              <p className="hero-lead">
                {content.text.tagline} {content.text.heroDescription}
              </p>
              <div className="hero-actions">
                <button className="button hero-primary" data-book>
                  {content.text.heroButton}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
            <div className="hero-footer">
              <HeroWeather locale={locale} />
            </div>
          </section>
          <section
            className="experiences light-panel"
            id="experiences"
            aria-labelledby="experiences-title"
          >
            {sectionLocked(locks, "experiences") ? (
              <LockedSection
                as="div"
                section="experiences"
                locale={locale}
                whatsapp={WHATSAPP_NUMBER}
              />
            ) : (
              <>
                <div
                  className="section-heading flex items-center justify-between gap-5"
                  data-reveal
                >
                  <div>
                    <p className="eyebrow">{t.kickers.adventure}</p>
                    <h2 id="experiences-title">
                      {content.text.experiencesHeading}
                    </h2>
                  </div>
                </div>
                <EventBanners
                  banners={banners}
                  whatsapp={content.contact.whatsapp}
                  locale={locale}
                />
                {/* Accordion: the item under the pointer (or keyboard focus)
                widens and shows its prices; diving is open by default. */}
                <div
                  className="experience-row"
                  id="prices"
                  data-visible-activities={visibleActivities.length}
                  onMouseLeave={() => hoverLayout() && setOpenActivity(null)}
                >
                  {visibleActivities.map((key, index) => {
                    const open = key === (openActivity || visibleActivities[0]);
                    const locked = pageLocked(locks, key);
                    const prices =
                      !locked && content.priceList?.[key]?.length > 0;
                    return (
                      <article
                        key={key}
                        className={"experience-item" + (open ? " is-open" : "")}
                        aria-label={t.activityLabels[key]}
                        onMouseEnter={() =>
                          hoverLayout() && setOpenActivity(key)
                        }
                        onFocus={() => setOpenActivity(key)}
                        data-reveal
                        style={{ "--reveal-delay": `${index * 80}ms` }}
                      >
                        <ExperienceCard
                          activityKey={key}
                          activity={content.activities[key]}
                          className={cardClasses[key]}
                          kicker={kickers[key]}
                          locale={locale}
                          locked={locked}
                        />
                        {prices && !open && (
                          <button
                            type="button"
                            className="experience-toggle"
                            onClick={() => setOpenActivity(key)}
                          >
                            {t.prices.show(t.activityLabels[key])}
                            <span aria-hidden="true">↓</span>
                          </button>
                        )}
                        {prices && (
                          <PricePanel
                            priceList={content.priceList}
                            products={content.shop?.products ?? []}
                            group={key}
                            locale={locale}
                            hidden={!open}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
            {sectionLocked(locks, "course") ? (
              <LockedSection
                as="div"
                section="course"
                locale={locale}
                whatsapp={WHATSAPP_NUMBER}
              />
            ) : (
              <div className="quiz-panel" data-reveal>
                <img
                  className="quiz-photo"
                  src={content.images.course}
                  srcSet={photoSrcSet(content.images.course)}
                  sizes="(max-width: 1320px) 100vw, 1280px"
                  alt=""
                  width="1536"
                  height="864"
                  loading="lazy"
                />
                <p className="eyebrow">{t.course.kicker}</p>
                <h2>{content.text.quizTitle}</h2>
                <p>{content.text.quizDescription}</p>
                <a
                  className="button quiz-button"
                  href={localeHref(locale, "/course")}
                >
                  {t.course.cta + " "}
                  <span>{"↗"}</span>
                </a>
                <button className="quiz-help" id="open-quiz" type="button">
                  {t.course.help}
                </button>
                <PartnerMarquee
                  partners={content.courses?.partners}
                  locale={locale}
                />
                <div className="photo-fan" aria-hidden="true">
                  {[
                    "galleryDive",
                    "galleryFreedive",
                    "galleryCoral",
                    "galleryTurtle",
                    "galleryIsland",
                  ].map((key, index) => (
                    <div
                      className={`fan-photo photo-${["one", "two", "three", "four", "five"][index]}`}
                      key={key}
                    >
                      <img
                        src={content.images[key]}
                        alt=""
                        width="640"
                        height="426"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          {sectionLocked(locks, "dive-sites") ? (
            <LockedSection
              section="dive-sites"
              id="dive-sites"
              locale={locale}
              whatsapp={WHATSAPP_NUMBER}
            />
          ) : (
            <DiveSiteMap locale={locale} />
          )}
          {sectionLocked(locks, "ocean") ? (
            <LockedSection
              section="ocean"
              id="ocean"
              locale={locale}
              whatsapp={WHATSAPP_NUMBER}
            />
          ) : (
            <section className="ocean-section" id="ocean">
              <div
                className="section-heading flex items-center justify-between gap-5"
                data-reveal
              >
                <div>
                  <p className="eyebrow">{t.gallery.eyebrow}</p>
                  <h2>
                    {content.text.oceanTitle1}
                    <br />
                    {content.text.oceanTitle2}
                  </h2>
                </div>
                <p className="section-intro">{content.text.oceanDescription}</p>
              </div>
              <div className="ocean-grid">
                <article className="ocean-card reef-card" data-reveal>
                  <img
                    className="ocean-photo"
                    data-depth
                    src={content.images.reef}
                    alt={h.reefAlt}
                    width="1200"
                    height="800"
                    loading="lazy"
                  />
                  <h3>
                    {h.reefTitle[0]}
                    <br />
                    {h.reefTitle[1]}
                  </h3>
                </article>
                <article
                  className="ocean-card open-card"
                  data-reveal
                  style={{ "--reveal-delay": "100ms" }}
                >
                  <img
                    className="ocean-photo"
                    data-depth
                    src={content.images.ocean}
                    srcSet={photoSrcSet(content.images.ocean)}
                    sizes="(max-width: 700px) 90vw, 45vw"
                    alt={h.oceanAlt}
                    width="1200"
                    height="800"
                    loading="lazy"
                  />
                  <h3>
                    {h.oceanTitle[0]}
                    <br />
                    {h.oceanTitle[1]}
                  </h3>
                </article>
              </div>
              {sectionLocked(locks, "videos") ? (
                content.gallery?.videos?.length > 0 && (
                  <LockedSection
                    as="div"
                    section="videos"
                    locale={locale}
                    whatsapp={WHATSAPP_NUMBER}
                  />
                )
              ) : (
                <DiveVideos videos={content.gallery?.videos} locale={locale} />
              )}
              <DiveGallery gallery={content.gallery} locale={locale} />
            </section>
          )}
          {sectionLocked(locks, "shop") ? (
            <LockedSection
              section="shop"
              id="dive-shop"
              locale={locale}
              whatsapp={WHATSAPP_NUMBER}
            />
          ) : (
            <ShopTeaser
              shop={content.shop}
              service={withService(content).service}
              whatsapp={content.contact.whatsapp}
              locale={locale}
              locks={locks}
              payments={payments}
              fares={content.fares}
              stock={stock}
            />
          )}
          {sectionLocked(locks, "travel") ? (
            <LockedSection
              section="travel"
              id="getting-here"
              locale={locale}
              whatsapp={WHATSAPP_NUMBER}
            />
          ) : (
            <TravelRoute whatsapp={WHATSAPP_NUMBER} locale={locale} />
          )}
          {sectionLocked(locks, "contact") ? (
            <LockedSection
              section="contact"
              id="contact"
              locale={locale}
              whatsapp={WHATSAPP_NUMBER}
            />
          ) : (
            <section
              className="contact-section"
              id="contact"
              aria-labelledby="contact-title"
            >
              <div className="contact-copy" data-reveal>
                <p className="eyebrow">{h.storeEyebrow}</p>
                <h2 id="contact-title">
                  {h.storeTitle[0]}
                  <br />
                  {h.storeTitle[1]}
                </h2>
                <p className="contact-description">{h.storeIntro}</p>
                <ul className="store-details">
                  <li>
                    <span className="contact-channel-icon">
                      <ContactIcon name="location" />
                    </span>
                    <span>
                      <small>{h.storeAddress}</small>
                      <strong>{storeAddress}</strong>
                    </span>
                  </li>
                  <li>
                    <span className="contact-channel-icon">
                      <ContactIcon name="whatsapp" />
                    </span>
                    <span>
                      <small>WHATSAPP</small>
                      <a
                        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsappVisit)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {WHATSAPP_DISPLAY}
                      </a>
                    </span>
                  </li>
                  {content.contact.email && (
                    <li>
                      <span className="contact-channel-icon">
                        <ContactIcon name="email" />
                      </span>
                      <span>
                        <small>EMAIL</small>
                        <a href={`mailto:${content.contact.email}`}>
                          {content.contact.email}
                        </a>
                      </span>
                    </li>
                  )}
                </ul>
                <div className="contact-actions">
                  <a
                    className="button dark"
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {h.directions} <span aria-hidden="true">↗</span>
                  </a>
                  <a
                    className="contact-chat"
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsappVisit)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {h.storeChat} <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <p className="contact-note">{h.storeNote}</p>
              </div>
              <div
                className="store-map"
                data-reveal
                style={{ "--reveal-delay": "100ms" }}
              >
                <iframe
                  title={h.mapTitle}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="store-map-caption">
                  <span>
                    <strong>Zanclus Dive Center</strong>
                    <small>Waisai · Raja Ampat</small>
                  </span>
                  <a href={mapLink} target="_blank" rel="noopener noreferrer">
                    {h.openMap} <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </section>
          )}
        </main>
        <SiteFooter
          contact={content.contact}
          activities={content.activities}
          tagline={content.text.tagline}
          locale={locale}
          home
        />
      </div>
      <dialog id="quiz-dialog" className="modal">
        <button className="close-modal" aria-label={h.closeQuiz}>
          {"×"}
        </button>
        <p className="eyebrow">{t.kickers.findNext}</p>
        <div id="quiz-content"></div>
      </dialog>
      <dialog id="booking-dialog" className="modal booking-modal">
        <button className="close-modal" aria-label={h.closeForm}>
          {"×"}
        </button>
        <p className="eyebrow">{t.kickers.planGood}</p>
        <h2>{h.bookingTitle}</h2>
        <p className="muted">{h.bookingIntro}</p>
        <form id="booking-form">
          <input
            name="website"
            hidden
            tabIndex="-1"
            autoComplete="off"
            aria-hidden="true"
          />
          <label>
            {h.name}
            <input
              name="name"
              autoComplete="name"
              required
              maxLength="80"
              placeholder={h.namePlaceholder}
            />
          </label>
          <label>
            {h.phone}
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              minLength="8"
              maxLength="30"
              placeholder={h.phonePlaceholder}
            />
          </label>
          <div className="form-row grid grid-cols-2 gap-4">
            <label>
              {h.date}
              <input type="date" name="date" required />
            </label>
            <label>
              {h.people}
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
            {h.experience}
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
            {h.notes}
            <textarea
              name="notes"
              rows="3"
              maxLength="1000"
              placeholder={h.notesPlaceholder}
            ></textarea>
          </label>
          <p
            className="booking-error"
            id="booking-error"
            role="alert"
            tabIndex="-1"
            hidden
          ></p>
          <p className="booking-privacy">{h.privacy}</p>
          <button className="button dark" type="submit">
            {h.submit + " "}
            <span>{"↗"}</span>
          </button>
        </form>
        <div id="booking-result" hidden aria-live="polite">
          <h3 tabIndex="-1" id="booking-success-title">
            {h.saved}
          </h3>
          <p className="booking-status">{h.waiting}</p>
          <p className="booking-reference" id="booking-reference"></p>
          <p id="booking-summary"></p>
          <p className="muted">{h.savedNote}</p>
          <a
            className="button dark"
            id="send-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            {h.continueWhatsApp}
          </a>
          <button className="button primary" id="download-plan">
            {h.download}
          </button>
          <button className="text-button" id="edit-plan">
            {h.another}
          </button>
        </div>
      </dialog>
    </>
  );
}
