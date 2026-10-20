"use client";
import { useEffect, useState } from "react";
import { Field } from "./fields.jsx";

function Copy({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="admin-inline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {}
      }}
    >
      {done ? "Tersalin" : "Salin"}
    </button>
  );
}

// SEO & Search Console: what Google reads from the site, the steps there,
// and the HTML tag for a URL-prefix property. A Domain property is verified
// in DNS and needs no tag.
export default function SeoEditor({ seo, site, onChange, onSave, busy }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const base = site?.url ?? "";
  const domain = base.replace(/^https?:\/\/(www\.)?/, "");
  const sitemap = base + "/sitemap.xml";
  const robots = base + "/robots.txt";
  const tagged = Boolean(seo?.googleVerification);
  // The admin opened on another domain than the one in canonical links.
  const otherDomain =
    origin &&
    base &&
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) &&
    origin.replace(/^https?:\/\/(www\.)?/, "") !== domain;
  return (
    <div className="admin-hr">
      <section className="admin-card">
        <h2>Yang dibaca Google</h2>
        <ul className="admin-seo-list">
          <li>
            <span>Alamat situs</span>
            <strong>{base}</strong>
            <small>
              Dipakai untuk link kanonik, hreflang ID/EN, dan gambar share.
            </small>
          </li>
          <li>
            <span>Sitemap</span>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
              {sitemap}
            </a>
            <Copy text={sitemap} />
          </li>
          <li>
            <span>robots.txt</span>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer">
              {robots}
            </a>
          </li>
          <li>
            <span>Verifikasi Google</span>
            {tagged ? (
              <strong className="is-ok">Tag HTML terpasang</strong>
            ) : (
              <strong>Lewat DNS</strong>
            )}
            <small>
              {tagged
                ? "Untuk properti Awalan URL. Properti Domain tetap diverifikasi lewat catatan TXT di DNS."
                : "Properti Domain diverifikasi lewat catatan TXT di DNS, tanpa tag HTML. Tag di bawah hanya untuk properti Awalan URL."}
            </small>
          </li>
          <li>
            <span>Data bisnis</span>
            <strong className="is-ok">Terpasang di beranda</strong>
            <small>
              Nama, WhatsApp, email, alamat Waisai, dan sosial media dari menu
              Kontak.
            </small>
          </li>
        </ul>
        {otherDomain && (
          <p className="admin-error" role="alert">
            Admin dibuka di {origin}, tetapi alamat situs untuk Google adalah{" "}
            {base}. Bila domain utama adalah {origin}, isi{" "}
            <code>SITE_URL={origin}</code> di hPanel → Variabel environment,
            lalu deploy ulang.
          </p>
        )}
      </section>

      <section className="admin-card">
        <h2>Langkah di Google Search Console</h2>
        <ol className="admin-seo-steps">
          <li>
            Buka{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
            >
              search.google.com/search-console
            </a>{" "}
            dengan akun Google bisnis, <b>Tambahkan properti</b>, pilih{" "}
            <b>Domain</b>, lalu isi <code>{domain}</code> tanpa https:// dan
            www.
          </li>
          <li>
            Salin catatan TXT dari Google. Di hPanel → Domain → DNS, tambah
            catatan <b>TXT</b> dengan nama <code>@</code> dan isi catatan tadi,
            lalu kembali ke Search Console dan tekan <b>Verifikasi</b>. Bila
            belum berhasil, tunggu DNS menyebar dan coba lagi. Catatan TXT
            jangan dihapus.
            <small>
              Tanpa akses DNS: pilih properti <b>Awalan URL</b>{" "}
              <code>{base}/</code> dengan metode <b>Tag HTML</b>, lalu tempel
              tagnya di kolom di bawah.
            </small>
          </li>
          <li>
            Setelah terverifikasi, buka <b>Sitemap</b>, isi alamat lengkap{" "}
            <code>{sitemap}</code>, lalu <b>Kirim</b>. Status{" "}
            <b>Couldn&apos;t fetch</b> sesaat setelah dikirim biasanya berubah
            menjadi <b>Success</b> dalam beberapa jam.
          </li>
          <li>
            Di <b>Pemeriksaan URL</b>, periksa <code>{base}/</code> dan{" "}
            <code>{base}/id</code>, lalu tekan <b>Minta pengindeksan</b>.
          </li>
          <li>
            Data mulai tampil dalam beberapa hari. Laporan <b>Halaman</b>{" "}
            menunjukkan halaman yang sudah atau belum diindeks.
          </li>
        </ol>
      </section>

      <section className="admin-card">
        <h2>Tag HTML (opsional)</h2>
        <p className="admin-subtle">
          Hanya untuk properti <b>Awalan URL</b> yang memilih metode Tag HTML.
          Properti Domain yang sudah terverifikasi lewat DNS tidak
          memerlukannya.
        </p>
        <form onSubmit={onSave} className="admin-hr-form">
          <Field
            label="Tag meta verifikasi"
            hint='Tempel tag dari Search Console, mis. <meta name="google-site-verification" content="…" />, atau isi content-nya saja. Kosongkan untuk melepas.'
          >
            <input
              name="googleVerification"
              maxLength={300}
              placeholder='<meta name="google-site-verification" content="…" />'
              value={seo?.googleVerification ?? ""}
              onChange={(e) => onChange({ googleVerification: e.target.value })}
            />
          </Field>
          <div className="admin-user-buttons">
            <button className="admin-button" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan kode verifikasi"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
