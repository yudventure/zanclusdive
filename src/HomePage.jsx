"use client";
import { useEffect, useRef } from "react";
import { initializeWebsite } from "./main.js";
import ShopTeaser from "./shop/ShopTeaser.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import ContactIcon from "./components/ContactIcon.jsx";
import ScrollEffects from "./components/ScrollEffects.jsx";
import HeroWeather from "./components/HeroWeather.jsx";
import LanguageSwitch from "./components/LanguageSwitch.jsx";
import { photoSrcSet } from "./photography.js";
import { dictionary, formatIDR, localeHref } from "./i18n.js";
import { youtubeId } from "./video.js";

function ExperienceCard({ activityKey, activity, className, kicker, locale }) {
  const t = dictionary(locale);
  const label = t.activityLabels[activityKey];
  return (
    <a
      className={`course-card ${className}`}
      data-activity={activityKey}
      href={localeHref(locale, `/${activityKey}`)}
      hidden={!activity.enabled}
      aria-label={t.common.viewDetailOf(label)}
      data-reveal={activityKey === "diving" ? undefined : true}
      style={{ "--reveal-delay": activityKey === "trip" ? "160ms" : "80ms" }}
    >
      <img
        className="course-photo"
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
    </a>
  );
}
export default function HomePage({ content, locale = "en", demo = false }) {
  const motionRoot = useRef(null);
  const t = dictionary(locale);
  const h = t.home;
  const videoId = youtubeId(content.heroVideo);
  const featured = ["snorkeling", "trip", "diving"].find(
    (key) => content.activities[key].enabled,
  );
  const WHATSAPP_NUMBER = content.contact.whatsapp;
  const WHATSAPP_DISPLAY = WHATSAPP_NUMBER.startsWith("62")
    ? "0" + WHATSAPP_NUMBER.slice(2)
    : "+" + WHATSAPP_NUMBER;
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
            <a href="#" className="active">
              {t.common.home}
            </a>
            <a href="#experiences">{t.common.experiences}</a>
            <a href="#ocean">{t.common.exploreOcean}</a>
            <a href="#calendar">{t.common.plan}</a>
            <a href={localeHref(locale, "/dive-shop")}>{"Dive Shop"}</a>
            <a href="#contact">{t.common.contact}</a>
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
                {/* Plays the YouTube link set in the CMS; until then it is
                    shown as coming soon. */}
                <button
                  className="hero-quiz"
                  type="button"
                  data-video={videoId || undefined}
                  disabled={!videoId}
                >
                  <span className="hero-quiz-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span>
                    {h.videoCta}
                    <small>{videoId ? h.videoMeta : h.videoSoon}</small>
                  </span>
                </button>
              </div>
            </div>
            {featured && (
              <a
                className="hero-feature"
                href={localeHref(locale, `/${featured}`)}
              >
                <img
                  src={content.activities[featured].cardImage}
                  srcSet={photoSrcSet(content.activities[featured].cardImage)}
                  sizes="96px"
                  alt=""
                  width="96"
                  height="72"
                />
                <span className="hero-feature-copy">
                  <strong>{t.activityLabels[featured]}</strong>
                  <small>{content.activities[featured].summary}</small>
                </span>
                <span className="hero-feature-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            )}
            <div className="hero-footer">
              <HeroWeather locale={locale} />
              <a
                className="hero-scroll"
                href="#experiences"
                aria-label={h.exploreExperiences}
              >
                <span className="hero-mouse" aria-hidden="true" />
                {h.scrollDown}
              </a>
            </div>
          </section>
          <section
            className="experiences light-panel"
            id="experiences"
            aria-labelledby="experiences-title"
          >
            <div
              className="section-heading flex items-center justify-between gap-5"
              data-reveal
            >
              <div>
                <p className="eyebrow">{"FIND YOUR KIND OF ADVENTURE"}</p>
                <h2 id="experiences-title">
                  {content.text.experiencesHeading}
                </h2>
              </div>
              <button className="button lime small" id="see-all">
                {h.seeAll + " "}
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
                aria-label={h.divingCalendar}
                data-reveal
              >
                <ExperienceCard
                  activityKey="diving"
                  activity={content.activities.diving}
                  className="beginner"
                  kicker={h.divingKicker}
                  locale={locale}
                />
                <div className="calendar-card" id="calendar">
                  <div className="calendar-heading">
                    <button id="prev-month" aria-label={h.prevMonth}>
                      {"‹"}
                    </button>
                    <h3 id="month-label"></h3>
                    <button id="next-month" aria-label={h.nextMonth}>
                      {"›"}
                    </button>
                  </div>
                  <div className="weekday-row" aria-hidden="true">
                    {h.weekdays.map((day, index) => (
                      <span key={index}>{day}</span>
                    ))}
                  </div>
                  <div
                    id="calendar-grid"
                    className="calendar-grid"
                    role="group"
                    aria-label={h.pickDate}
                  ></div>
                  <label
                    className="calendar-program"
                    htmlFor="calendar-experience"
                  >
                    {h.program}
                    <select id="calendar-experience">
                      {Object.entries(content.experiences)
                        .filter(([, e]) => e.enabled)
                        .map(([key, e]) => (
                          <option key={key} value={key}>
                            {e.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p
                    className="calendar-note"
                    id="calendar-note"
                    aria-live="polite"
                  >
                    {h.pickDateNote}
                  </p>
                  <button
                    className="button dark calendar-book-button"
                    id="calendar-book"
                    type="button"
                    disabled
                    aria-describedby="calendar-note calendar-book-help"
                  >
                    {h.bookDate} <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    className="text-button"
                    id="calendar-retry"
                    type="button"
                    hidden
                  >
                    {h.reloadSchedule}
                  </button>
                  <small id="calendar-book-help">{h.scheduleHelp}</small>
                  <noscript>
                    <small>{h.noscript}</small>
                  </noscript>
                </div>
              </article>
              <ExperienceCard
                activityKey="snorkeling"
                activity={content.activities.snorkeling}
                className="advanced"
                kicker={h.snorkelingKicker}
                locale={locale}
              />
              <ExperienceCard
                activityKey="trip"
                activity={content.activities.trip}
                className="specialty"
                kicker={h.tripKicker}
                locale={locale}
              />
            </div>
            <div className="quiz-panel" data-reveal>
              <p className="eyebrow">{"LET'S FIND YOUR NEXT DIVE"}</p>
              <h2>{content.text.quizTitle}</h2>
              <p>{content.text.quizDescription}</p>
              <button className="button quiz-button" id="open-quiz">
                {h.findChoice + " "}
                <span>{"↗"}</span>
              </button>
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
            <div id="more-courses" className="more-courses" hidden>
              <p>{h.moreCourses}</p>
              <button className="button dark" data-book>
                {h.planDive + " "}
                <span>{"↗"}</span>
              </button>
            </div>
          </section>
          <section className="ocean-section" id="ocean">
            <div
              className="section-heading flex items-center justify-between gap-5"
              data-reveal
            >
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
              <article className="ocean-card reef-card" data-reveal>
                <img
                  className="ocean-photo"
                  src={content.images.reef}
                  alt={h.reefAlt}
                  width="1200"
                  height="800"
                  loading="lazy"
                />
                <span>{h.reefLabel}</span>
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
                  src={content.images.ocean}
                  srcSet={photoSrcSet(content.images.ocean)}
                  sizes="(max-width: 700px) 90vw, 45vw"
                  alt={h.oceanAlt}
                  width="1200"
                  height="800"
                  loading="lazy"
                />
                <span>{h.oceanLabel}</span>
                <h3>
                  {h.oceanTitle[0]}
                  <br />
                  {h.oceanTitle[1]}
                </h3>
              </article>
            </div>
          </section>
          <ShopTeaser shop={content.shop} demo={demo} locale={locale} />
          <section
            className="contact-section"
            id="contact"
            aria-labelledby="contact-title"
          >
            <div className="contact-copy" data-reveal>
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
                  {h.planWithZanclus + " "}
                  <span>{"↗"}</span>
                </button>
                <a
                  className="contact-chat"
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsappDiscuss)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {h.chatTeam} <span aria-hidden="true">↗</span>
                </a>
              </div>
              <p className="contact-note">{h.contactNote}</p>
            </div>
            <div
              className="contact-panel"
              data-reveal
              style={{ "--reveal-delay": "100ms" }}
            >
              <p className="contact-panel-label">
                <span /> LET'S TALK ABOUT YOUR NEXT DIVE
              </p>
              <h3>{h.teamReady}</h3>
              <p>{h.teamIntro}</p>
              <a
                className="contact-channel"
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsappInfo)}`}
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
              <p className="contact-panel-note">{h.contactTopics}</p>
            </div>
          </section>
        </main>
        <SiteFooter
          contact={content.contact}
          activities={content.activities}
          tagline={content.text.tagline}
          demo={demo}
          locale={locale}
          home
        />
      </div>
      {videoId && (
        <dialog
          id="video-dialog"
          className="modal video-modal"
          aria-label={h.videoTitle}
        >
          <button className="close-modal" aria-label={h.closeVideo}>
            {"×"}
          </button>
          <div className="video-frame">
            <iframe
              title={h.videoTitle}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </dialog>
      )}
      <dialog id="quiz-dialog" className="modal">
        <button className="close-modal" aria-label={h.closeQuiz}>
          {"×"}
        </button>
        <p className="eyebrow">{"FIND YOUR NEXT DIVE"}</p>
        <div id="quiz-content"></div>
      </dialog>
      <dialog id="booking-dialog" className="modal booking-modal">
        <button className="close-modal" aria-label={h.closeForm}>
          {"×"}
        </button>
        <p className="eyebrow">{"LET'S PLAN SOMETHING GOOD"}</p>
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
          <p className="booking-privacy">
            {demo ? h.demoData : ""}
            {h.privacy}
          </p>
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
