import "server-only";
import { headers } from "next/headers";
import { currentAdmin } from "./auth.js";
import StatusView from "../components/StatusView.jsx";
import {
  visitorLocks,
  pageLocked,
  lockablePages,
  lockCount,
  visitorHeader,
} from "../developer.js";
import { localeHref } from "../i18n.js";

// The developer locks for this request. blocked is the maintenance page to
// show instead of the page when the visitor meets a whole-site or page lock;
// proxy.js normally answers those with a 503 before the page runs.
export async function developerGate(page, content, locale) {
  const developer = content.developer;
  if (!developer?.enabled) return { locks: visitorLocks(null), blocked: null };
  const locks = visitorLocks(developer, await seenAsAdmin());
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

// Whether this request sees the website as an admin: signed in, and not
// looking as a visitor (?pratinjau=pengunjung).
export const previewingAsVisitor = async () =>
  (await headers()).get(visitorHeader) === "1";
export async function seenAsAdmin() {
  return Boolean(await currentAdmin()) && !(await previewingAsVisitor());
}

// Shown to a signed-in admin on the public website while developer mode is
// on, so it is clear what visitors see, with a way to see it as they do.
export function DeveloperBar({ developer, path = "/" }) {
  const count = lockCount(developer);
  return (
    <div className="dev-bar" role="status">
      <span className="dev-bar-dot" aria-hidden="true" />
      <span>
        <strong>Mode developer aktif</strong>
        {developer.site
          ? ". Seluruh website tertutup untuk pengunjung"
          : count
            ? `. ${count} kunci aktif untuk pengunjung`
            : ". Belum ada yang dikunci"}
        . Kamu melihat versi admin.
      </span>
      <a href={`${path}?pratinjau=pengunjung`}>Lihat seperti pengunjung</a>
      <a href="/admin/developer" className="is-quiet">
        Atur
      </a>
    </div>
  );
}

// Shown to a signed-in admin looking at the website as a visitor.
export function VisitorPreviewBar({ path = "/" }) {
  return (
    <div className="dev-bar is-preview" role="status">
      <span className="dev-bar-dot" aria-hidden="true" />
      <span>
        <strong>Pratinjau pengunjung</strong>. Kamu melihat website seperti
        pengunjung yang tidak masuk.
      </span>
      <a href={`${path}?pratinjau=admin`}>Kembali ke tampilan admin</a>
    </div>
  );
}
