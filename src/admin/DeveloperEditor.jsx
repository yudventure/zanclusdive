"use client";
import { useId } from "react";
import { lockablePages, lockableSections, lockCount } from "../developer.js";
import { serviceText } from "../service-model.js";

// Checkbox list of things to lock.
function Choices({ legend, hint, options, chosen, onChange }) {
  const id = useId();
  return (
    <fieldset className="admin-dev-choices" aria-describedby={id}>
      <legend>{legend}</legend>
      <p className="admin-subtle" id={id}>
        {hint}
      </p>
      <div className="admin-dev-grid">
        {options.map(([key, label, note]) => (
          <label
            key={key}
            className={
              "admin-dev-choice" + (chosen.includes(key) ? " is-on" : "")
            }
          >
            <input
              type="checkbox"
              checked={chosen.includes(key)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...chosen, key]
                    : chosen.filter((k) => k !== key),
                )
              }
            />
            <span>
              <strong>{label}</strong>
              {note && <small>{note}</small>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const statusLinks = [
  ["/maintenance?lang=id", "Perawatan seluruh website", "503"],
  ["/maintenance?page=1&lang=id", "Satu halaman diperbarui", "503"],
  ["/halaman-yang-tidak-ada", "Halaman tidak ditemukan", "404"],
  ["/status/403.html?lang=id", "Akses ditolak", "403"],
  ["/status/500.html?lang=id", "Kesalahan server", "500"],
  ["/status/502.html?lang=id", "Sambungan server terputus", "502"],
  ["/status/503.html?lang=id", "Server tidak tersedia", "503"],
  ["/status/504.html?lang=id", "Server terlalu lama", "504"],
  ["/status/offline.html?lang=id", "Internet pengunjung terputus", "Offline"],
];

// Developer mode: lock the whole website, pages, homepage sections or
// single products and services while working on them.
export default function DeveloperEditor({
  developer,
  products,
  services,
  update,
  onSave,
  busy,
}) {
  const count = lockCount(developer);
  const set = (key) => (value) => update(key, value);
  const save = (
    <button className="admin-button" disabled={busy}>
      {busy ? "Menyimpan…" : "Simpan mode developer"}
    </button>
  );
  return (
    <form onSubmit={onSave} className="admin-dev">
      <section
        className={
          "admin-card admin-dev-master" + (developer.enabled ? " is-on" : "")
        }
      >
        <div className="admin-dev-head">
          <div>
            <h2>Mode developer</h2>
            <p className="admin-subtle">
              Saat aktif, apa pun yang kamu kunci di halaman ini tertutup untuk
              pengunjung dan diganti tampilan perawatan. Selama masuk sebagai
              admin, kamu tetap melihat website lengkap dengan bar penanda di
              bawah layar. Matikan untuk membuka semuanya sekaligus; pilihan
              kunci tetap tersimpan untuk lain kali.
            </p>
          </div>
          <label className="admin-dev-switch">
            <input
              type="checkbox"
              role="switch"
              checked={developer.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
            />
            <span aria-hidden="true" />
            {developer.enabled ? "Aktif" : "Mati"}
          </label>
        </div>
        <p className="admin-dev-status" role="status">
          {!developer.enabled
            ? "Mode developer mati: website terbuka untuk semua pengunjung."
            : developer.site
              ? "Seluruh website terkunci. Pengunjung melihat halaman perawatan (kode 503)."
              : count
                ? `${count} kunci aktif untuk pengunjung.`
                : "Mode developer aktif, tapi belum ada yang dikunci."}
        </p>
        {save}
      </section>

      <section className="admin-card">
        <h2>Kunci seluruh website</h2>
        <label className="admin-dev-choice admin-dev-site">
          <input
            type="checkbox"
            checked={developer.site}
            onChange={(e) => update("site", e.target.checked)}
          />
          <span>
            <strong>Tutup seluruh website untuk pengunjung</strong>
            <small>
              Semua halaman menampilkan halaman perawatan dengan kode 503, jadi
              Google tahu ini sementara. Halaman admin tetap bisa dibuka.
            </small>
          </span>
        </label>
        <div className="admin-form-grid admin-dev-message">
          <div className="admin-field">
            <label htmlFor="dev-message-id">
              Pesan untuk pengunjung (Indonesia)
            </label>
            <textarea
              id="dev-message-id"
              rows="3"
              maxLength={400}
              placeholder="Contoh: Kami sedang memperbarui katalog alat selam."
              value={developer.message.id}
              onChange={(e) =>
                update("message", { ...developer.message, id: e.target.value })
              }
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dev-message-en">
              Message for visitors (English)
            </label>
            <textarea
              id="dev-message-en"
              rows="3"
              maxLength={400}
              placeholder="Example: We are updating the dive gear catalogue."
              value={developer.message.en}
              onChange={(e) =>
                update("message", { ...developer.message, en: e.target.value })
              }
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dev-until">Perkiraan selesai (WIT, opsional)</label>
            <input
              id="dev-until"
              type="datetime-local"
              value={developer.until}
              onChange={(e) => update("until", e.target.value)}
            />
          </div>
        </div>
        <p className="admin-subtle">
          Pesan dan perkiraan selesai tampil di halaman perawatan, baik saat
          seluruh website dikunci maupun satu halaman.
        </p>
        {save}
      </section>

      <section className="admin-card">
        <h2>Kunci sebagian</h2>
        <Choices
          legend="Per halaman"
          hint="Halaman yang dikunci menampilkan halaman perawatan dengan tombol kembali ke beranda. Kartu Diving, Snorkeling, dan Trip laut di beranda ikut ditandai."
          options={lockablePages.map(([key, label, path]) => [
            key,
            label,
            path,
          ])}
          chosen={developer.pages}
          onChange={set("pages")}
        />
        <Choices
          legend="Per bagian beranda"
          hint="Bagian yang dikunci diganti kartu “Sedang diperbarui” dengan tombol WhatsApp."
          options={lockableSections}
          chosen={developer.sections}
          onChange={set("sections")}
        />
        <Choices
          legend="Per item: produk Dive Shop"
          hint="Produk tetap terlihat dengan tanda “Sedang diperbarui”, tapi tidak bisa dimasukkan ke keranjang."
          // The same model can be both a product for sale and rental gear.
          options={products.map((p) => [
            "product:" + p.id,
            `${p.name || p.id} · ${p.saleEnabled ? "Jual" : "Sewa"}`,
            p.enabled ? "" : "Draft, belum tampil",
          ])}
          chosen={developer.items}
          onChange={set("items")}
        />
        <Choices
          legend="Per item: servis alat selam"
          hint="Servis tetap terlihat dengan tanda “Sedang diperbarui”, tapi tidak bisa dipilih di formulir."
          options={services.map((s) => [
            "service:" + s.id,
            serviceText(s.name, "id") || s.id,
            s.enabled ? "" : "Disembunyikan",
          ])}
          chosen={developer.items}
          onChange={set("items")}
        />
        {save}
      </section>

      <section className="admin-card">
        <h2>Halaman perawatan & error</h2>
        <p className="admin-subtle">
          Semua halaman ini sudah disiapkan dalam Bahasa Indonesia dan English.
          Halaman offline, 502, 503, dan 504 disimpan di browser pengunjung yang
          pernah membuka website, jadi tetap tampil saat internet mereka putus
          atau server Hostinger tidak menjawab.
        </p>
        <ul className="admin-dev-links">
          {statusLinks.map(([href, label, code]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                <span className="admin-dev-code">{code}</span>
                {label}
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </form>
  );
}
