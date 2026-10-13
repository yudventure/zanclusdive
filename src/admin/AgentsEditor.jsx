"use client";
import { useEffect, useId, useState } from "react";

const dateLabel = (value) =>
  new Date(value + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const timeLabel = (value) =>
  new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jayapura",
  }) + " WIT";

function Copy({ label, value, href }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="admin-pay-copy">
      <small>{label}</small>
      <code>{value}</code>
      <span className="admin-agent-copy-actions">
        {href && (
          <a
            className="admin-inline"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka ↗
          </a>
        )}
        <button
          type="button"
          className="admin-inline"
          onClick={async () => {
            await navigator.clipboard?.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? "Tersalin" : "Salin"}
        </button>
      </span>
    </div>
  );
}

function Fields({ value, change }) {
  const id = useId();
  return (
    <div className="admin-form-grid">
      <div className="admin-field">
        <label htmlFor={id + "-name"}>Nama agen</label>
        <input
          id={id + "-name"}
          required
          maxLength={80}
          value={value.name}
          onChange={(e) => change({ name: e.target.value })}
        />
      </div>
      <div className="admin-field">
        <label htmlFor={id + "-contact"}>Kontak (WhatsApp / email)</label>
        <input
          id={id + "-contact"}
          maxLength={120}
          value={value.contact}
          onChange={(e) => change({ contact: e.target.value })}
        />
      </div>
      <div className="admin-field admin-agent-wide">
        <label htmlFor={id + "-url"}>Link kalender agen (opsional)</label>
        <input
          id={id + "-url"}
          inputMode="url"
          maxLength={600}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          value={value.importUrl}
          onChange={(e) => change({ importUrl: e.target.value })}
        />
      </div>
      <label className="admin-dev-choice admin-agent-wide">
        <input
          type="checkbox"
          checked={value.share}
          onChange={(e) => change({ share: e.target.checked })}
        />
        <span>
          <strong>Bagikan hari sibuk agen ini ke agen lain</strong>
          <small>
            Agen lain melihat “{value.name || "nama agen"} · terisi” di kalender
            mereka, tanpa detail tamu.
          </small>
        </span>
      </label>
    </div>
  );
}

function AgentCard({ agent, origin, busy, run }) {
  const [edit, setEdit] = useState({
    name: agent.name,
    contact: agent.contact,
    importUrl: agent.importUrl,
    share: agent.share,
  });
  useEffect(
    () =>
      setEdit({
        name: agent.name,
        contact: agent.contact,
        importUrl: agent.importUrl,
        share: agent.share,
      }),
    [agent],
  );
  const url = `/api/admin/agents/${agent.id}`;
  const feed = `${origin}/api/calendar/${agent.token}.ics`;
  const partner = `${origin}/partner/${agent.token}`;
  const upcoming = (agent.events ?? []).slice(0, 6);
  return (
    <article
      className={"admin-card admin-agent" + (agent.enabled ? "" : " off")}
    >
      <header className="admin-agent-head">
        <div>
          <h3>{agent.name}</h3>
          <small>{agent.contact || "Kontak belum diisi"}</small>
        </div>
        <span
          className={"admin-pay-badge " + (agent.enabled ? "paid" : "failed")}
        >
          {agent.enabled ? "Aktif" : "Nonaktif"}
        </span>
      </header>
      <div className="admin-agent-block">
        <h4>Kalender Zanclus → agen</h4>
        <p className="admin-subtle">
          Kirim halaman partner ke agen. Dari sana mereka menambahkan kalender
          Zanclus ke Google Calendar, Apple, atau Outlook dengan satu klik.
        </p>
        <Copy label="Halaman partner" value={partner} href={partner} />
        <Copy label="Link kalender (.ics)" value={feed} />
      </div>
      <div className="admin-agent-block">
        <h4>Kalender agen → Zanclus</h4>
        {agent.importUrl ? (
          <p
            className={
              "admin-agent-sync " +
              (agent.syncError ? "warn" : agent.syncedAt ? "ok" : "")
            }
          >
            {agent.syncError
              ? `Belum terbaca: ${agent.syncError}`
              : agent.syncedAt
                ? `Terakhir dibaca ${timeLabel(agent.syncedAt)} · ${agent.events?.length ?? 0} acara`
                : "Menunggu dibaca pertama kali."}
          </p>
        ) : (
          <p className="admin-subtle">
            Minta agen mengirim alamat kalendernya. Di Google Calendar: Setelan
            kalender → Alamat rahasia dalam format iCal.
          </p>
        )}
        {upcoming.length > 0 && (
          <ul className="admin-agent-events">
            {upcoming.map((event) => (
              <li key={event.uid}>
                <time>
                  {dateLabel(event.start)}
                  {event.end !== event.start && ` – ${dateLabel(event.end)}`}
                </time>
                {event.summary}
              </li>
            ))}
          </ul>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(url, "PUT", edit, "Data agen tersimpan.");
        }}
      >
        <Fields
          value={edit}
          change={(patch) => setEdit((current) => ({ ...current, ...patch }))}
        />
        <div className="admin-agent-actions">
          <button className="admin-button" disabled={busy}>
            Simpan
          </button>
          {agent.importUrl && (
            <button
              type="button"
              className="admin-button secondary"
              disabled={busy}
              onClick={() =>
                run(
                  url,
                  "PUT",
                  { action: "sync" },
                  "Kalender agen dibaca ulang.",
                )
              }
            >
              Baca kalender sekarang
            </button>
          )}
          <button
            type="button"
            className="admin-button secondary"
            disabled={busy}
            onClick={() =>
              run(
                url,
                "PUT",
                { enabled: !agent.enabled },
                agent.enabled ? "Agen dinonaktifkan." : "Agen diaktifkan.",
              )
            }
          >
            {agent.enabled ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button
            type="button"
            className="admin-text-button"
            disabled={busy}
            onClick={() =>
              window.confirm(
                `Buat link baru untuk ${agent.name}? Link lama langsung berhenti bekerja.`,
              ) &&
              run(
                url,
                "PUT",
                { action: "token" },
                "Link baru dibuat. Kirim ulang ke agen.",
              )
            }
          >
            Buat link baru
          </button>
          <button
            type="button"
            className="admin-text-button"
            disabled={busy}
            onClick={() =>
              window.confirm(
                `Hapus ${agent.name}? Link kalendernya berhenti bekerja.`,
              ) && run(url, "DELETE", undefined, "Agen dihapus.")
            }
          >
            Hapus
          </button>
        </div>
      </form>
    </article>
  );
}

// Travel agents whose calendars are linked with Zanclus, both ways.
export default function AgentsEditor({ agents, busy, run, reload }) {
  const [origin, setOrigin] = useState("");
  const blank = { name: "", contact: "", importUrl: "", share: true };
  const [draft, setDraft] = useState(blank);
  useEffect(() => {
    setOrigin(window.location.origin);
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <section className="admin-card">
        <h2>Kalender bersama travel agent</h2>
        <p className="admin-subtle">
          Setiap agen mendapat link kalender pribadi berisi jadwal tamu Zanclus
          (jumlah tamu, tanpa nama dan nomor), tanggal tutup, dan kegiatan.
          Kalender ini otomatis diperbarui di Google Calendar, Apple, atau
          Outlook mereka. Sebaliknya, link kalender agen dibaca setiap 30 menit
          dan tampil di kalender reservasi. Agen yang membagikan kalendernya
          saling melihat hari sibuk satu sama lain.
        </p>
        <form
          className="admin-agent-new"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await run(
                "/api/admin/agents",
                "POST",
                draft,
                "Agen ditambahkan. Kirim halaman partner ke agen.",
              )
            )
              setDraft(blank);
          }}
        >
          <h3>Tambah agen</h3>
          <Fields
            value={draft}
            change={(patch) =>
              setDraft((current) => ({ ...current, ...patch }))
            }
          />
          <button className="admin-button" disabled={busy}>
            Tambah agen
          </button>
        </form>
      </section>
      {agents.length === 0 ? (
        <p className="admin-subtle">Belum ada agen.</p>
      ) : (
        agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            origin={origin}
            busy={busy}
            run={run}
          />
        ))
      )}
    </>
  );
}
