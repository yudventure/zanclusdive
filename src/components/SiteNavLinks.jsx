import { activityKeys } from "../activity-model.js";
import { dictionary, localeHref } from "../i18n.js";

// The same main menu on every public page. On the homepage the links jump to
// its sections; elsewhere they lead back to them, and Dive Shop opens the
// full Dive Shop page (its catalog when already there). "Experiences" holds the three activity pages.
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
          page === "activity",
        )}
        {visible.length > 0 && (
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
          </div>
        )}
      </div>
      {item("dive-sites", section("dive-sites"), t.common.diveSites)}
      {item("ocean", section("ocean"), t.common.exploreOcean)}
      {item(
        "dive-shop",
        home ? "#dive-shop" : page === "shop" ? "#catalog" : href("/dive-shop"),
        "Dive Shop",
        page === "shop",
        page === "shop",
      )}
      {item("contact", section("contact"), t.common.contact)}
    </>
  );
}
