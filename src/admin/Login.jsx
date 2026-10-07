"use client";
import { useState } from "react";
export default function Login({ configured }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign("/admin");
    } catch (e) {
      setError(e.message || "Login gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-root admin-login">
      <a className="admin-back" href="/">
        ← Kembali ke website
      </a>
      <section className="admin-login-card">
        <img
          src="/assets/logo-header-light.svg"
          alt="Zanclus Dive Center"
          width="220"
          height="55"
        />
        <p className="admin-eyebrow">OWNER WORKSPACE</p>
        <h1>Selamat datang kembali.</h1>
        <p>
          Kelola pengalaman, konten, dan reservasi Zanclus dari satu tempat.
        </p>
        {configured ? (
          <form onSubmit={login}>
            <label>
              Email admin
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-button" disabled={busy}>
              {busy ? "Memeriksa…" : "Masuk ke dashboard →"}
            </button>
          </form>
        ) : (
          <div className="admin-setup">
            <h2>CMS perlu dikonfigurasi.</h2>
            <p>
              Buat database MySQL, lalu isi MYSQL_HOST, MYSQL_DATABASE,
              MYSQL_USER, MYSQL_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, dan
              SESSION_SECRET di environment variable Hostinger.
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
        <small>Area khusus pemilik. Tidak ada password bawaan.</small>
      </section>
    </div>
  );
}
