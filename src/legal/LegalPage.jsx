import PageHeader from "../components/PageHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ContactIcon from "../components/ContactIcon.jsx";
import {
  legalBlocks,
  legalKeys,
  legalLabels,
  legalPaths,
  legalText,
} from "../legal-model.js";
import { fareChoices, fareSettings } from "../fare-model.js";
import { dictionary, localeHref } from "../i18n.js";

// One policy page: terms, privacy, or reschedule and refund. Its texts
// come from the admin (content.legal); the refund page also lists the
// fares as set in the price list, so it always matches checkout.
export default function LegalPage({ kind, content, locale = "en" }) {
  const dict = dictionary(locale);
  const l = dict.legal;
  const legal = content.legal;
  const page = legal[kind];
  const title = legalText(page.title, locale);
  const intro = legalText(page.intro, locale);
  const href = (path) => localeHref(locale, path);
  const updated = new Date(legal.updated + "T12:00:00").toLocaleDateString(
    locale === "id" ? "id-ID" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const sections = page.sections.map((s, i) => ({
    id: `bagian-${i + 1}`,
    heading: legalText(s.heading, locale),
    blocks: legalBlocks(legalText(s.body, locale)),
  }));
  const fares = fareSettings(content.fares);
  const choices = kind === "refund" ? fareChoices(content.fares) : [];
  const contact = content.contact;
  const chat = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(l.askMessage(title.toLowerCase()))}`;
  return (
    <div className="activity-page legal-page">
      <a className="skip-link" href="#legal-main">
        {l.skip}
      </a>
      <PageHeader
        locale={locale}
        page={kind}
        path={legalPaths[kind]}
        activities={content.activities}
        whatsapp={contact.whatsapp}
        message={l.askMessage(title.toLowerCase())}
      />
      <main id="legal-main">
        <section
          className="activity-hero legal-hero"
          aria-labelledby="legal-title"
        >
          <div className="activity-container activity-hero-content">
            <div className="activity-breadcrumb">
              <a href={href("/")}>{dict.common.home}</a>
              <span aria-hidden="true">/</span>
              <span>{title}</span>
            </div>
            <p className="eyebrow">{l.kicker}</p>
            <h1 id="legal-title">{title}</h1>
            {intro && <p className="activity-hero-summary">{intro}</p>}
            <p className="legal-updated">{l.updated(updated)}</p>
          </div>
        </section>
        <div className="activity-body legal-body">
          <div className="activity-container legal-layout">
            <aside className="legal-aside" aria-labelledby="legal-contents">
              <div className="legal-contents">
                <p id="legal-contents">{l.contents}</p>
                <ul>
                  {kind === "refund" && (
                    <li>
                      <a href="#tarif">{l.faresTitle}</a>
                    </li>
                  )}
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a href={"#" + s.id}>{s.heading}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
            <article className="legal-article">
              {kind === "refund" && (
                <section className="legal-section legal-fares" id="tarif">
                  <h2>{l.faresTitle}</h2>
                  {fares.enabled && choices.length > 1 ? (
                    <>
                      <p>{l.faresIntro}</p>
                      <ul className="legal-fare-list">
                        {choices.map(({ tier, percent }) => (
                          <li key={tier}>
                            <strong>
                              {dict.fare.names[tier]}
                              {percent > 0 && <em>+{percent}%</em>}
                            </strong>
                            <span>{dict.fare.rules[tier](fares)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>{l.faresOff}</p>
                  )}
                </section>
              )}
              {sections.map((s) => (
                <section className="legal-section" id={s.id} key={s.id}>
                  <h2>{s.heading}</h2>
                  {s.blocks.map((block, i) =>
                    block.type === "list" ? (
                      <ul key={i}>
                        {block.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i}>{block.text}</p>
                    ),
                  )}
                </section>
              ))}
              <section className="legal-ask" aria-labelledby="legal-ask">
                <h2 id="legal-ask">{l.askTitle}</h2>
                <p>{l.askText}</p>
                <div className="legal-ask-actions">
                  <a
                    className="button primary legal-ask-chat"
                    href={chat}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ContactIcon name="whatsapp" /> {l.chat}
                  </a>
                  {contact.email && (
                    <a
                      className="legal-ask-mail"
                      href={`mailto:${contact.email}`}
                    >
                      <ContactIcon name="email" /> {contact.email}
                    </a>
                  )}
                </div>
              </section>
              <section className="legal-others" aria-labelledby="legal-others">
                <h2 id="legal-others">{l.others}</h2>
                <div>
                  {legalKeys
                    .filter((key) => key !== kind)
                    .map((key) => (
                      <a key={key} href={href(legalPaths[key])}>
                        {legalText(legalLabels[key], locale)}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                </div>
              </section>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter
        contact={contact}
        activities={content.activities}
        tagline={content.text.tagline}
        locale={locale}
      />
    </div>
  );
}
