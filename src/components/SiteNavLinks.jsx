import { activityKeys } from "../activity-model.js";
import { dictionary, localeHref } from "../i18n.js";

// The same main menu on every public page. On the homepage the links jump to
// its sections; elsewhere they lead back to them, and Dive Shop opens the
// full Dive Shop page (its catalog when already there). "Experiences" holds
// the activity pages and the courses; Dive Shop holds the catalog and the
// gear service.
export default function SiteNavLinks({
  locale,
  page = "home",
  activityKey,
  activities,
  onNavigate,
}) {
  const t = dictionary(locale);
  const home = page === "home";
  const href = (path) => localeHref(locale, path);
  const section = (id) => (home ? "#" + id : href("/#" + id));
  const visible = activityKeys.filter((key) => activities?.[key]?.enabled);
  const sub = (link, label, current) => (
    <a
      href={link}
      className={current ? "current" : undefined}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
    >
      {label}
    </a>
  );
  const item = (key, link, label, active, current = false) => (
    <a
      key={key}
      href={link}
      className={active ? "active" : undefined}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
    >
      {label}
    </a>
  );
  return (
    <>
      {item("home", home ? "#" : href("/"), t.common.home, home)}
      <div className="nav-group">
        {item(
          "experiences",
          section("experiences"),
          t.common.experiences,
          page === "activity" || page === "course",
        )}
        <div className="nav-sub">
          {visible.map((key) => (
            <a
              key={key}
              href={href("/" + key)}
              className={key === activityKey ? "current" : undefined}
              aria-current={key === activityKey ? "page" : undefined}
              onClick={onNavigate}
            >
              {t.activityLabels[key]}
            </a>
          ))}
          <a
            href={href("/course")}
            className={page === "course" ? "current" : undefined}
            aria-current={page === "course" ? "page" : undefined}
            onClick={onNavigate}
          >
            {t.course.nav}
          </a>
        </div>
      </div>
      {item("dive-sites", section("dive-sites"), t.common.diveSites)}
      {item("ocean", section("ocean"), t.common.exploreOcean)}
      <div className="nav-group">
        {item(
          "dive-shop",
          home
            ? "#dive-shop"
            : page === "shop"
              ? "#catalog"
              : href("/dive-shop"),
          "Dive Shop",
          page === "shop" || page === "service",
          page === "shop",
        )}
        <div className="nav-sub">
          {sub(
            page === "shop" ? "#catalog" : href("/dive-shop"),
            t.service.shopNav,
            false,
          )}
          {sub(href("/service"), t.service.nav, page === "service")}
        </div>
      </div>
      {item(
        "about",
        href("/about"),
        t.about.nav,
        page === "about",
        page === "about",
      )}
      {item("contact", section("contact"), t.common.contact)}
    </>
  );
}
