"use client";
import { useState } from "react";
import { demoAccount } from "../demo-data.js";
import FormField from "../components/FormField.jsx";
import { PasswordForm } from "./PasswordEditor.jsx";

// JSON request for the forgotten-password form.
async function call(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Permintaan gagal.");
  return result;
}
export default function Login({
  configured,
  issues = [],
  demo = false,
  database = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [diagnostic, setDiagnostic] = useState(null);
  async function diagnose(event) {
    const form = event.currentTarget.form;
    if (!form.reportValidity()) return;
    setBusy(true);
    setError("");
    setDiagnostic(null);
    const data = Object.fromEntries(new FormData(form));
    const testInput = form.elements.namedItem("mysqlPassword");
    if (testInput) testInput.value = "";
    try {
      const response = await fetch("/api/admin/database-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!result.target) throw new Error(result.error || "Pemeriksaan gagal.");
      setDiagnostic(result);
    } catch (e) {
      setError(e.message || "Pemeriksaan gagal.");
    } finally {
      setBusy(false);
    }
  }
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setDiagnostic(null);
    try {
      const form = new FormData(event.currentTarget);
      const data = { email: form.get("email"), password: form.get("password") };
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.code ? `${result.error} (${result.code})` : result.error,
        );
      window.location.assign("/admin");
    } catch (e) {
      setError(e.message || "Login gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-root admin-login">
      <aside className="admin-login-visual" aria-hidden="true">
        <img
          className="admin-login-photo"
          src="/assets/photos/ocean-manta.webp"
          alt=""
          width="1200"
          height="800"
        />
        <img
          className="admin-login-logo"
          src="/assets/logo-header-dark.svg"
          alt=""
          width="176"
          height="44"
        />
        <div className="admin-login-message">
          <p className="admin-login-kicker">ZANCLUS DIVE CENTER · RAJA AMPAT</p>
          <h2>Ruang kerja tim Zanclus.</h2>
          <p>
            Kelola reservasi, kalender kegiatan, Dive Shop, galeri, dan isi
            website dari satu tempat.
          </p>
          <ul>
            <li>Reservasi</li>
            <li>Kalender kegiatan</li>
            <li>Dive Shop</li>
            <li>Galeri</li>
          </ul>
        </div>
        <p className="admin-login-place">
          Waisai · Raja Ampat · Papua Barat Daya
        </p>
      </aside>
      <main className="admin-login-panel">
        <a className="admin-back" href="/">
          ← Kembali ke website
        </a>
        <section className="admin-login-card">
          <img
            className="admin-login-card-logo"
            src="/assets/logo-header-light.svg"
            alt="Zanclus Dive Center"
            width="176"
            height="44"
          />
          <p className="admin-eyebrow">OPERATOR SIGN IN</p>
          <h1>Selamat datang kembali.</h1>
          <p>Masuk dengan akun operator untuk mengelola website Zanclus.</p>
          {configured && forgot ? (
            <div className="admin-forgot">
              <h2>Lupa password</h2>
              <p>
                Isi email operator, minta kode OTP, lalu buat password baru.
                Kode dikirim ke email pemulihan akun.
              </p>
              <FormField id="forgot-email" label="Email operator" icon="email">
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="username"
                  placeholder="operator@zanclusdive.com"
                  required
                />
              </FormField>
              <PasswordForm
                forgot
                request={call}
                email={() =>
                  document.getElementById("forgot-email").value.trim()
                }
                onDone={() => window.location.assign("/admin")}
              />
              <button
                type="button"
                className="admin-inline"
                onClick={() => setForgot(false)}
              >
                ← Kembali ke login
              </button>
            </div>
          ) : configured ? (
            <form onSubmit={login}>
              <FormField id="login-email" label="Email operator" icon="email">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  defaultValue={demo ? demoAccount.email : ""}
                  readOnly={demo}
                  autoComplete="username"
                  placeholder="operator@zanclusdive.com"
                  required
                />
              </FormField>
              <FormField id="login-password" label="Password" icon="lock">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  defaultValue={demo ? demoAccount.password : ""}
                  readOnly={demo}
                  autoComplete="current-password"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                />
              </FormField>
              {!demo && (
                <label className="admin-login-show">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Tampilkan password
                </label>
              )}
              {error && (
                <p className="admin-error" role="alert">
                  {error}
                </p>
              )}
              <button className="admin-button" disabled={busy}>
                {busy ? "Memeriksa…" : "Masuk ke dashboard →"}
              </button>
              {database && (
                <details className="admin-db-password-test">
                  <summary>Uji dengan password MySQL langsung</summary>
                  <p>
                    Opsional: masukkan password user database dari hPanel untuk
                    dibandingkan dengan konfigurasi aktif. Password hanya
                    dipakai sekali untuk pemeriksaan, tidak disimpan.
                  </p>
                  <label>
                    Password user MySQL untuk uji
                    <input
                      type="password"
                      name="mysqlPassword"
                      autoComplete="off"
                      maxLength={500}
                    />
                  </label>
                </details>
              )}
              {database && (
                <button
                  type="button"
                  className="admin-button secondary"
                  disabled={busy}
                  onClick={diagnose}
                >
                  Periksa koneksi database
                </button>
              )}
              {diagnostic && (
                <section className="admin-db-diagnostic" aria-live="polite">
                  <h2>
                    {diagnostic.ok
                      ? "Koneksi database berhasil."
                      : "Hasil pemeriksaan database"}
                  </h2>
                  <p>
                    Pemeriksaan ini memakai konfigurasi yang sedang berjalan di
                    server. Laporan tidak memuat password.
                  </p>
                  <pre>
                    {[
                      `Versi: ${diagnostic.version}`,
                      `MYSQL_HOST=${diagnostic.target.host}`,
                      `MYSQL_PORT=${diagnostic.target.port}`,
                      `MYSQL_DATABASE=${diagnostic.target.database}`,
                      `MYSQL_USER=${diagnostic.target.user}`,
                      `Koneksi: ${diagnostic.target.transport}`,
                      `Sumber password: ${diagnostic.passwordTest?.source === "form" ? "diisi pada form uji" : "environment aktif"}`,
                      diagnostic.passwordTest?.source === "form"
                        ? `Sama dengan MYSQL_PASSWORD aktif: ${diagnostic.passwordTest.matchesRuntime ? "ya" : "tidak"}`
                        : "",
                      diagnostic.code
                        ? `Kode: ${diagnostic.code}`
                        : "Hasil: koneksi dan akses database berhasil",
                      diagnostic.connectingHost
                        ? `Host asal menurut MySQL: ${diagnostic.connectingHost}`
                        : "",
                      diagnostic.identity
                        ? `Akun MySQL: ${diagnostic.identity.account}\nKlien MySQL: ${diagnostic.identity.client}\nServer MySQL: ${diagnostic.identity.server}:${diagnostic.identity.port}`
                        : "",
                      diagnostic.tables
                        ? `Tabel CMS: ${diagnostic.tables.length}/3`
                        : "",
                      diagnostic.error || "",
                      ...(diagnostic.warnings || []),
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </pre>
                  {diagnostic.ok &&
                  diagnostic.passwordTest?.source === "form" &&
                  !diagnostic.passwordTest.matchesRuntime ? (
                    <p>
                      Password uji berhasil, tetapi berbeda dari MYSQL_PASSWORD
                      yang dibaca aplikasi. Isi MYSQL_PASSWORD dengan password
                      uji yang sama di hPanel, simpan, lalu deploy ulang sebelum
                      login. Tes ini tidak menyimpan perubahan.
                    </p>
                  ) : (
                    diagnostic.ok && (
                      <p>
                        Kamu dapat mencoba masuk. Tabel yang belum ada dibuat
                        saat login; pemeriksaan ini tidak mengubah database.
                      </p>
                    )
                  )}
                </section>
              )}
            </form>
          ) : (
            <div className="admin-setup">
              <h2>Konfigurasi CMS belum lengkap.</h2>
              <p>Aplikasi belum dapat memakai variabel berikut:</p>
              <ul>
                {issues.map(({ name, reason }) => (
                  <li key={name}>
                    <code>{name}</code>: {reason}
                  </li>
                ))}
              </ul>
              <p>
                Buka hPanel → Variabel environment, isi atau perbaiki variabel
                di atas, simpan, lalu deploy ulang aplikasi. Mengunduh file .env
                saja belum mengisi variabel di Hostinger. Jangan upload file
                berisi password ke GitHub.
              </p>
              <a
                href="https://github.com/yudventure/zanclusdive/blob/main/CMS-HOSTINGER.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka panduan setup CMS ↗
              </a>
            </div>
          )}
          {configured && !forgot && (
            <button
              type="button"
              className="admin-inline admin-forgot-link"
              onClick={() => setForgot(true)}
            >
              Lupa password? Reset dengan kode OTP email
            </button>
          )}
          <small>Area khusus tim Zanclus.</small>
        </section>
      </main>
    </div>
  );
}
