import { activityKeys } from "../activity-model.js";
import { photoSrcSet } from "../photography.js";
import { dictionary, localeHref } from "../i18n.js";

export default function ActivityCards({
  activities,
  exclude,
  locale = "en",
}) {
  const t = dictionary(locale).activity;
  const labels = dictionary(locale).activityLabels;
  const visible = activityKeys.filter(
    (key) => key !== exclude && activities[key].enabled,
  );
  if (!visible.length) return null;
  return (
    <section
      className="activity-discovery"
      id={exclude ? "other-activities" : "activities"}
      aria-labelledby="activity-discovery-title"
    >
      <div className="activity-container">
        <div className="activity-section-heading" data-reveal>
          <div>
            <p className="eyebrow">CHOOSE YOUR OCEAN STORY</p>
            <h2 id="activity-discovery-title">
              {exclude ? t.otherTitle : t.allTitle}
            </h2>
          </div>
          <p>{t.cardsIntro}</p>
        </div>
        <div
          className="activity-cards"
          style={{ "--activity-count": visible.length }}
        >
          {visible.map((key) => {
            const activity = activities[key];
            return (
              <a
                className="activity-card"
                href={localeHref(locale, `/${key}`)}
                key={key}
                data-reveal
              >
                <div className="activity-card-image">
                  <img
                    src={activity.cardImage}
                    srcSet={photoSrcSet(activity.cardImage)}
                    sizes="(max-width: 700px) 90vw, 45vw"
                    alt={activity.cardImageAlt}
                    width="560"
                    height="380"
                    loading="lazy"
                  />
                  <span className="activity-card-label">{labels[key]}</span>
                  <span className="activity-card-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="activity-card-copy">
                  <h3>{activity.title}</h3>
                  <p>{activity.summary}</p>
                  <span className="activity-card-link">
                    {t.cardLink(labels[key])} <span aria-hidden="true">↗</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
