import { activityKeys, activityLabels } from "../activity-model.js";
import { photoSrcSet } from "../photography.js";

export default function ActivityCards({ activities, exclude, demo = false }) {
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
              {exclude
                ? "Masih banyak cerita untuk dijelajahi."
                : "Tiga cara menikmati laut."}
            </h2>
          </div>
          <p>
            Lihat detail kegiatan, temukan pilihanmu, lalu susun rencana bersama
            tim Zanclus.
          </p>
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
                href={`/${key}`}
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
                  <span className="activity-card-label">
                    {activityLabels[key]}
                  </span>
                  <span className="activity-card-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="activity-card-copy">
                  <h3>{activity.title}</h3>
                  <p>{activity.summary}</p>
                  <span className="activity-card-link">
                    Lihat detail {activityLabels[key].toLowerCase()}{" "}
                    <span aria-hidden="true">↗</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
        {demo && (
          <p className="activity-demo-note">
            Contoh aktivitas untuk demo. Lokasi, jadwal, dan biaya dikonfirmasi
            bersama tim.
          </p>
        )}
      </div>
    </section>
  );
}
