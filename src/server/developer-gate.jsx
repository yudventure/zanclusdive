import "server-only";
import { currentAdmin } from "./auth.js";
import StatusView from "../components/StatusView.jsx";
import {
  visitorLocks,
  pageLocked,
  lockablePages,
  lockCount,
} from "../developer.js";
import { localeHref } from "../i18n.js";

// The developer locks for this request. blocked is the maintenance page to
// show instead of the page when the visitor meets a whole-site or page lock;
// proxy.js normally answers those with a 503 before the page runs.
export async function developerGate(page, content, locale) {
  const developer = content.developer;
  if (!developer?.enabled) return { locks: visitorLocks(null), blocked: null };
  const locks = visitorLocks(developer, Boolean(await currentAdmin()));
  if (!pageLocked(locks, page)) return { locks, blocked: null };
  const href = lockablePages.find(([key]) => key === page)?.[2] ?? "/";
  return {
    locks,
    blocked: (
      <StatusView
        kind={locks.site ? "maintenance" : "page"}
        locale={locale}
        whatsapp={content.contact?.whatsapp}
        message={developer.message?.[locale] || developer.message?.id || ""}
        until={developer.until || ""}
        switchHref={localeHref(locale === "id" ? "en" : "id", href)}
      />
    ),
  };
}

// Shown to a signed-in admin on the public website while developer mode is
// on, so it is clear what visitors see.
export function DeveloperBar({ developer }) {
  const count = lockCount(developer);
  return (
    <div className="dev-bar" role="status">
      <span className="dev-bar-dot" aria-hidden="true" />
      <span>
        <strong>Mode developer aktif</strong>
        {developer.site
          ? " · Seluruh website terkunci untuk pengunjung"
          : count
            ? ` · ${count} kunci aktif untuk pengunjung`
            : " · Belum ada yang dikunci"}
        . Kamu melihat versi admin.
      </span>
      <a href="/admin/developer">Atur</a>
    </div>
  );
}
