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

const pools = [
  ["diving", "Diving (termasuk kursus)"],
  ["snorkeling", "Snorkeling"],
  ["trip", "Trip laut"],
];
const impacts = [
  ["info", "Hanya tampil di kalender reservasi"],
  ["places", "Memakai slot harian (jumlah tamu)"],
  ["block", "Menutup tanggal (penuh)"],
];
const feeds = [
  ["detail", "Jadwal lengkap: jumlah tamu, tutup, kegiatan (agen)"],
  ["blocks", "Hanya tanggal penuh & tutup (OTA)"],
];
// New OTAs start with the settings an OTA needs.
export const kindDefaults = {
  agent: { feedMode: "detail", impact: "info" },
  ota: { feedMode: "blocks", impact: "places" },
};

function Fields({ value, change }) {
  const id = useId();
  const select = (key, label, options, wide) => (
    <div className={"admin-field" + (wide ? " admin-agent-wide" : "")}>
      <label htmlFor={id + "-" + key}>{label}</label>
      <select
        id={id + "-" + key}
        value={value[key]}
        onChange={(e) => change({ [key]: e.target.value })}
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
  const number = (key, label, hint) => (
    <div className="admin-field">
      <label htmlFor={id + "-" + key}>{label}</label>
      <input
        id={id + "-" + key}
        type="number"
        min="1"
        max="30"
        value={value[key]}
        onChange={(e) => change({ [key]: Number(e.target.value) || 1 })}
      />
      {hint && <small className="admin-subtle">{hint}</small>}
    </div>
  );
  return (
    <div className="admin-form-grid">
      <div className="admin-field">
        <label htmlFor={id + "-kind"}>Jenis</label>
        <select
          id={id + "-kind"}
          value={value.kind}
          onChange={(e) =>
            change({ kind: e.target.value, ...kindDefaults[e.target.value] })
          }
        >
          <option value="agent">Travel agent / partner</option>
          <option value="ota">OTA (Booking.com, Airbnb, GetYourGuide…)</option>
        </select>
      </div>
      {select("pool", "Aktivitas & slot harian", pools)}
      <div className="admin-field">
        <label htmlFor={id + "-name"}>
          {value.kind === "ota" ? "Nama OTA" : "Nama agen"}
        </label>
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
        <label htmlFor={id + "-url"}>
          {value.kind === "ota"
            ? "Link iCal / ICS dari extranet OTA (impor ke Zanclus)"
            : "Link kalender agen (opsional)"}
        </label>
        <input
          id={id + "-url"}
          inputMode="url"
          maxLength={600}
          placeholder={
            value.kind === "ota"
              ? "https://…/calendar.ics"
              : "https://calendar.google.com/calendar/ical/…/basic.ics"
          }
          value={value.importUrl}
          onChange={(e) => change({ importUrl: e.target.value })}
        />
      </div>
      {select("impact", "Acara dari link ini", impacts)}
      {value.impact === "places" &&
        number(
          "perEvent",
          "Slot per acara bila jumlah tamu tidak tertulis",
          "Jumlah tamu dibaca dari judul atau catatan, mis. “3 pax”.",
        )}
      {select(
        "feedMode",
        "Isi link kalender Zanclus untuk mereka",
        feeds,
        true,
      )}
      {value.feedMode === "blocks" &&
        number(
          "feedMinPlaces",
          "Tandai penuh bila sisa slot kurang dari",
          "Mencegah OTA menjual grup yang tidak muat.",
        )}
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

// Settings of a saved agent, with the defaults of agents saved before
// these settings existed.
const editable = (agent) => ({
  name: agent.name,
  contact: agent.contact,
  importUrl: agent.importUrl,
  share: agent.share,
  kind: agent.kind ?? "agent",
  feedMode: agent.feedMode ?? "detail",
  impact: agent.impact ?? "info",
  pool: agent.pool ?? "diving",
  perEvent: agent.perEvent ?? 2,
  feedMinPlaces: agent.feedMinPlaces ?? 4,
});

function AgentCard({ agent, origin, busy, run }) {
  const [edit, setEdit] = useState(editable(agent));
  useEffect(() => setEdit(editable(agent)), [agent]);
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
          <h3>
            {agent.name}{" "}
            <span className="admin-agent-kind">
              {agent.kind === "ota" ? "OTA" : "Agen"}
            </span>
          </h3>
          <small>{agent.contact || "Kontak belum diisi"}</small>
        </div>
        <span
          className={"admin-pay-badge " + (agent.enabled ? "paid" : "failed")}
        >
          {agent.enabled ? "Aktif" : "Nonaktif"}
        </span>
      </header>
      <div className="admin-agent-block">
        <h4>Kalender Zanclus → {agent.kind === "ota" ? "OTA" : "agen"}</h4>
        {agent.feedMode === "blocks" ? (
          <p className="admin-subtle">
            Tempel link ini di extranet OTA, di menu impor kalender iCal / ICS.
            Isinya hanya tanggal yang penuh (sisa slot kurang dari{" "}
            {agent.feedMinPlaces ?? 4}) atau tutup, sehingga OTA berhenti
            menjual tanggal itu. Tanpa nama atau jumlah tamu.
          </p>
        ) : (
          <p className="admin-subtle">
            Kirim halaman partner ke agen. Dari sana mereka menambahkan kalender
            Zanclus ke Google Calendar, Apple, atau Outlook dengan satu klik.
          </p>
        )}
        {agent.feedMode !== "blocks" && (
          <Copy label="Halaman partner" value={partner} href={partner} />
        )}
        <Copy label="Link kalender (.ics)" value={feed} />
      </div>
      <div className="admin-agent-block">
        <h4>{agent.kind === "ota" ? "OTA" : "Kalender agen"} → Zanclus</h4>
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
                ? `Terakhir dibaca ${timeLabel(agent.syncedAt)} · ${agent.events?.length ?? 0} acara · ${impacts.find(([key]) => key === (agent.impact ?? "info"))[1].toLowerCase()}`
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
                {agent.impact === "block" && !event.free && (
                  <small> · tanggal ditutup</small>
                )}
                {agent.impact === "places" && !event.free && (
                  <small>
                    {" "}
                    · {event.people ?? agent.perEvent ?? 2} slot
                    {event.people ? "" : " (perkiraan)"}
                  </small>
                )}
                {event.free && <small> · bebas (tidak memakai slot)</small>}
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
  const blank = {
    name: "",
    contact: "",
    importUrl: "",
    share: true,
    kind: "agent",
    feedMode: "detail",
    impact: "info",
    pool: "diving",
    perEvent: 2,
    feedMinPlaces: 4,
  };
  const [draft, setDraft] = useState(blank);
  useEffect(() => {
    setOrigin(window.location.origin);
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <section className="admin-card">
        <h2>Kalender bersama travel agent & OTA</h2>
        <p className="admin-subtle">
          Setiap agen mendapat link kalender pribadi berisi jadwal tamu Zanclus
          (jumlah tamu, tanpa nama dan nomor), tanggal tutup, dan kegiatan.
          Kalender ini otomatis diperbarui di Google Calendar, Apple, atau
          Outlook mereka. Sebaliknya, link kalender agen dibaca setiap 30 menit
          dan tampil di kalender reservasi. Agen yang membagikan kalendernya
          saling melihat hari sibuk satu sama lain.
        </p>
        <p className="admin-subtle">
          <strong>OTA dengan sinkron iCal / ICS</strong>: pilih jenis OTA. Link
          Zanclus untuk OTA hanya berisi tanggal penuh dan tutup, dan pesanan
          dari link iCal OTA memakai slot harian (mis. 30 penyelam per hari),
          sehingga tamu website dan OTA tidak melebihi kuota. OTA tanpa menu
          iCal / ICS di extranetnya perlu channel manager.
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
