"use client";
import { useEffect, useRef, useState } from "react";
import { defaultCourses, courseText, logoBox } from "../course-model.js";
import { dictionary } from "../i18n.js";

// One logo, sized by its shape so every logo looks the same size. Logos
// uploaded before the shape was recorded are measured once they load.
function PartnerLogo({ partner }) {
  const image = useRef(null);
  const [ratio, setRatio] = useState(partner.logoRatio || 0);
  useEffect(() => {
    if (partner.logoRatio) return;
    const img = image.current;
    const measure = () =>
      img?.naturalWidth && setRatio(img.naturalWidth / img.naturalHeight);
    if (img?.complete) measure();
    img?.addEventListener("load", measure);
    return () => img?.removeEventListener("load", measure);
  }, [partner.logoRatio]);
  const box = logoBox(ratio || 1);
  return (
    <img
      ref={image}
      className={partner.logoStyle === "white" ? "is-white" : "is-color"}
      src={partner.logo}
      alt={partner.name}
      width={box.width}
      height={box.height}
      style={{ "--logo-w": `${box.width}px`, "--logo-h": `${box.height}px` }}
    />
  );
}

// Running strip of dive certification partners. Each partner is only its
// logo (or short name) and full name over a dark photo or band: no cards
// or borders. Logos keep their colours unless set to white.
// The list is drawn once per copy, with just enough copies to cover the
// screen, and the strip moves by one copy, so the loop is seamless and the
// moving strip stays narrow: Safari on iPhone drops parts of a very wide
// moving layer. The copies are hidden from screen readers.
export default function PartnerMarquee({ partners, locale, tone = "photo" }) {
  const c = dictionary(locale).course;
  const list = partners ?? defaultCourses.partners;
  const first = useRef(null);
  const [run, setRun] = useState({ copies: 2, width: 0 });
  useEffect(() => {
    const copy = first.current;
    if (!copy) return;
    const measure = () => {
      const width = copy.getBoundingClientRect().width;
      const view = copy.parentElement.parentElement.clientWidth;
      if (!width) return;
      const copies = Math.max(2, Math.ceil(view / width) + 1);
      setRun((current) =>
        current.width === width && current.copies === copies
          ? current
          : { copies, width },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    observer.observe(copy.parentElement.parentElement);
    return () => observer.disconnect();
  }, [list.length]);
  if (!list.length) return null;
  const items = list.map((partner, index) => (
    <li key={index}>
      {partner.logo ? (
        <PartnerLogo partner={partner} />
      ) : (
        <strong className="partner-name">{partner.name}</strong>
      )}
      {courseText(partner.full, locale) && (
        <small>{courseText(partner.full, locale)}</small>
      )}
    </li>
  ));
  return (
    <div className={`partner-marquee partner-marquee-${tone}`}>
      <p className="partner-marquee-title">{c.partnersKicker}</p>
      <div className="partner-marquee-window">
        <div
          className={
            "partner-marquee-track" + (run.width ? " is-measured" : "")
          }
          style={
            run.width
              ? {
                  "--copy-w": `${run.width}px`,
                  // The same speed whatever the number of partners.
                  "--run": `${Math.round(run.width / 40)}s`,
                }
              : undefined
          }
        >
          <ul ref={first} aria-label={c.partnersLabel}>
            {items}
          </ul>
          {Array.from({ length: run.copies - 1 }, (_, index) => (
            <ul key={index} aria-hidden="true">
              {items}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
