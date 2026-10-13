import { defaultCourses, courseText } from "../course-model.js";
import { photoSrcSet } from "../photography.js";
import { dictionary, formatIDR, localeHref } from "../i18n.js";

// Homepage section that offers the dive courses, from a first try dive to a
// rescue license. Each card leads to the course on /course; "help me
// choose" opens the existing quiz (#open-quiz, handled in main.js).
export default function CourseOffer({ courses, locale }) {
  const c = dictionary(locale).course;
  const href = (path) => localeHref(locale, path);
  const items = (courses ?? defaultCourses).items.filter((x) => x.enabled);
  if (!items.length) return null;
  return (
    <section
      className="course-offer"
      id="courses"
      aria-labelledby="courses-title"
    >
      <div className="course-offer-head" data-reveal>
        <div>
          <p className="eyebrow">{c.kicker}</p>
          <h2 id="courses-title">{c.homeTitle}</h2>
        </div>
        <p>{c.homeIntro}</p>
      </div>
      <ol className="course-offer-list">
        {items.map((course, index) => (
          <li key={course.id} data-reveal>
            <a
              className="course-offer-card"
              href={href(`/course#${course.id}`)}
            >
              <span className="course-offer-photo">
                {course.image && (
                  <img
                    src={course.image}
                    srcSet={photoSrcSet(course.image)}
                    sizes="(max-width: 700px) 90vw, 25vw"
                    alt=""
                    width="640"
                    height="426"
                    loading="lazy"
                  />
                )}
                <span className="course-offer-step">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="course-offer-body">
                <span className="course-offer-level">
                  {courseText(course.level, locale)}
                </span>
                <h3>{courseText(course.name, locale)}</h3>
                <span className="course-offer-meta">
                  {[course.duration, course.depth]
                    .map((v) => courseText(v, locale))
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="course-offer-price">
                  <small>{c.from}</small>
                  <strong>{formatIDR(course.price, locale)}</strong>
                  <small>{courseText(course.unit, locale)}</small>
                </span>
                <span className="course-offer-link">
                  {c.detail} <span aria-hidden="true">↗</span>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <div className="course-offer-actions" data-reveal>
        <a className="button dark" href={href("/course")}>
          {c.allCourses} <span aria-hidden="true">↗</span>
        </a>
        <button className="button quiz-button" id="open-quiz" type="button">
          {c.help} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
