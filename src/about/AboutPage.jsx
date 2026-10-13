"use client";
import { useRef } from "react";
import ScrollEffects from "../components/ScrollEffects.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import SectionBanner from "../activities/SectionBanner.jsx";
import { activityKeys } from "../activity-model.js";
import { aboutText, paragraphs } from "../about-model.js";
import { photoSrcSet } from "../photography.js";
import { phoneLabel } from "../contact-model.js";
import { dictionary, localeHref } from "../i18n.js";

const icons = {
  story:
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  values: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  services: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  chat: "M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6z",
  location:
    "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  diving:
    "M3 9h12a3 3 0 0 1 0 6h-1l-2-2-2 2H6a3 3 0 0 1-3-3zM18 6v6l3 3M7 19c2 0 2-1 4-1s2 1 4 1",
  snorkeling:
    "M3 10h10a3 3 0 0 1 0 6h-1l-2-2-2 2H6a3 3 0 0 1-3-3zM18 3v11a3 3 0 0 1-3 3",
  trip: "M3 17h18l-3 4H6zM7 17V9h8l3 8M11 9V3l5 3-5 2",
  course: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6",
  shop: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  service:
    "M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2zM18 4l2 2",
};
function Icon({ name, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}

export default function AboutPage({ content, locale = "en" }) {
  const dict = dictionary(locale);
  const a = dict.about;
  const about = content.about;
  const href = (path) => localeHref(locale, path);
  const motionRoot = useRef(null);
  const banner = (kind, [eyebrow, title, intro]) => (
    <SectionBanner
      theme="about"
      kind={kind}
      eyebrow={eyebrow}
      title={title}
      intro={intro}
    />
  );
  // Every service Zanclus offers, each leading to its own page.
  const services = [
    ...activityKeys
      .filter((key) => content.activities[key]?.enabled)
      .map((key) => [key, dict.activityLabels[key], href("/" + key)]),
    ...(content.courses.items.some((c) => c.enabled)
      ? [["course", dict.course.nav, href("/course")]]
      : []),
    ["shop", "Dive Shop", href("/dive-shop")],
    ["service", dict.service.nav, href("/service")],
  ];
  const facts = a.facts.map(([label, value], index) =>
    index === 2
      ? [label, phoneLabel(content.contact.whatsapp)]
      : [label, value],
  );
  const chat = `https://wa.me/${content.contact.whatsapp}?text=${encodeURIComponent(a.askMessage)}`;
  return (
    <div
      className="activity-page about-page"
      data-theme="about"
      ref={motionRoot}
    >
      <ScrollEffects rootRef={motionRoot} />
      <a className="skip-link" href="#about-main">
        {dict.activity.skip}
      </a>
      <PageHeader
        locale={locale}
        page="about"
        path="/about"
        activities={content.activities}
        whatsapp={content.contact.whatsapp}
        message={a.askMessage}
      />
      <main id="about-main">
        <section
          className="activity-hero"
          aria-labelledby="about-title"
          data-parallax
        >
          {about.image && (
            <img
              className="activity-hero-photo"
              src={about.image}
              srcSet={photoSrcSet(about.image)}
              sizes="100vw"
              alt=""
              width="1672"
              height="941"
              fetchPriority="high"
            />
          )}
          <div className="activity-container activity-hero-content">
            <div className="activity-breadcrumb">
              <a href={href("/")}>{dict.common.home}</a>
              <span aria-hidden="true">/</span>
              <span>{a.nav}</span>
            </div>
            <p className="eyebrow">{a.heroKicker}</p>
            <h1 id="about-title">{aboutText(about.title, locale)}</h1>
            {aboutText(about.intro, locale) && (
              <p className="activity-hero-summary">
                {aboutText(about.intro, locale)}
              </p>
            )}
            <dl className="activity-hero-facts">
              {facts.map(([label, value], index) => (
                <div key={label}>
                  <Icon name={["location", "services", "chat"][index]} />
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <div className="activity-body">
          <div className="activity-container about-container">
            <div
              className="activity-jump-links"
              aria-label={dict.activity.sections}
            >
              {["story", "values", "services"].map((id, index) => (
                <a href={"#" + id} key={id}>
                  <Icon name={id} />
                  {a.sections[index]}
                </a>
              ))}
            </div>
            <section className="activity-block" id="story" data-reveal>
              {banner("story", a.story)}
              <div className="about-story">
                {paragraphs(about.story, locale).map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </div>
            </section>
            {about.values.length > 0 && (
              <section className="activity-block" id="values" data-reveal>
                {banner("values", a.values)}
                <ul className="course-why about-values">
                  {about.values.map((value, index) => (
                    <li key={index}>
                      <span aria-hidden="true">{index + 1}</span>
                      <strong>{aboutText(value.title, locale)}</strong>
                      <p>{aboutText(value.text, locale)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="activity-block" id="services" data-reveal>
              {banner("services", a.services)}
              <ul className="about-services">
                {services.map(([key, label, link]) => (
                  <li key={key}>
                    <a href={link} className="about-service">
                      <span className="about-service-icon" aria-hidden="true">
                        <Icon name={key} size={22} />
                      </span>
                      <strong>{label}</strong>
                      <p>{a.serviceText[key]}</p>
                      <span className="about-service-more">
                        {a.open} <span aria-hidden="true">↗</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section className="about-visit" data-reveal="fade">
              <div>
                <p className="eyebrow">{a.visitKicker}</p>
                <h2>{a.visitTitle}</h2>
                <p>{a.visitText}</p>
                {content.contact.location && (
                  <p className="about-visit-location">
                    <ContactIcon name="location" />
                    {content.contact.location}
                  </p>
                )}
              </div>
              <div className="about-visit-actions">
                <a
                  className="button lime"
                  href={chat}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ContactIcon name="whatsapp" /> {a.chat}
                </a>
                <a className="about-visit-link" href={href("/#contact")}>
                  {a.contactLink} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter
        contact={content.contact}
        activities={content.activities}
        tagline={content.text.tagline}
        locale={locale}
      />
    </div>
  );
}
