"use client";
import { cloneElement, useEffect, useId, useState } from "react";

function Field({ label, hint, children }) {
  const id = useId();
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
      {hint && <small className="admin-subtle">{hint}</small>}
    </div>
  );
}

// Change the signed-in account's password with a six-digit code sent by
// email. Used in the admin (signed in) and on the login page ("Lupa
// password", with the email typed in).
export function PasswordForm({ request, email, recipient, onDone, forgot }) {
  const [sent, setSent] = useState(null);
  const [wait, setWait] = useState(0);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  async function send() {
    if (forgot && !email()) {
      setError("Isi email operator terlebih dahulu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await request("/api/admin/password", "POST", {
        action: "send",
        ...(forgot ? { email: email() } : {}),
      });
      setSent(result);
      setWait(60);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event) {
    event.preventDefault();
    if (password !== again) {
      setError("Ulangi password baru dengan sama persis.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/password", "POST", {
        action: "change",
        code,
        password,
        ...(forgot ? { email: email() } : {}),
      });
      setCode("");
      setPassword("");
      setAgain("");
      setSent(null);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-password">
      <ol className="admin-password-steps">
        <li className={sent ? "done" : "current"}>
          <strong>Kirim kode OTP ke email</strong>
          <span>
            {forgot
              ? "Kode dikirim ke email pemulihan akun operator."
              : `Kode dikirim ke ${recipient}.`}
          </span>
          <button
            type="button"
            className="admin-button secondary"
            disabled={busy || wait > 0}
            onClick={send}
          >
            {wait > 0
              ? `Kirim ulang dalam ${wait} detik`
              : sent
                ? "Kirim ulang kode"
                : "Kirim kode OTP"}
          </button>
          {sent && (
            <p className="admin-success" role="status">
              {sent.message ||
                `Kode OTP sudah dikirim ke ${sent.recipient}. Berlaku ${sent.minutes} menit; periksa juga folder spam.`}
            </p>
          )}
        </li>
        <li className={sent ? "current" : ""}>
          <strong>Masukkan kode dan password baru</strong>
          <form onSubmit={save} className="admin-password-form">
            <Field label="Kode OTP (6 angka)">
              <input
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field label="Password baru" hint="Minimal 10 karakter.">
              <input
                name="new-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={10}
                maxLength={200}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Ulangi password baru">
              <input
                name="new-password-again"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                minLength={10}
                maxLength={200}
                required
                value={again}
                onChange={(e) => setAgain(e.target.value)}
              />
            </Field>
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
              />
              Tampilkan password
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-button" disabled={busy || !sent}>
              {busy ? "Memproses…" : "Simpan password baru"}
            </button>
          </form>
        </li>
      </ol>
    </div>
  );
}

// The "Ubah password" page in the admin.
export default function PasswordEditor({ request }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    request("/api/admin/password")
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="admin-card">
      <h2>Ganti password dengan kode OTP email</h2>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <>
          <p className="admin-subtle">
            Akun <b>{info.email}</b>. Untuk keamanan, password baru disimpan
            setelah kamu memasukkan kode OTP yang dikirim ke{" "}
            <b>{info.recipient}</b>. Setelah diganti, login di perangkat lain
            berakhir; perangkat ini tetap masuk.
          </p>
          {info.mail.length > 0 ? (
            <ul className="admin-pay-checks">
              <li className="warn">
                Pengiriman email belum diatur di hosting, jadi kode OTP belum
                bisa dikirim. Di hPanel → Variabel environment, isi{" "}
                {info.mail.map((name, i) => (
                  <span key={name}>
                    {i > 0 && ", "}
                    <code>{name}</code>
                  </span>
                ))}
                , simpan, lalu deploy ulang. Untuk email Hostinger:{" "}
                <code>SMTP_HOST=smtp.hostinger.com</code>,{" "}
                <code>SMTP_PORT=465</code>, <code>SMTP_USER</code> = alamat
                email lengkap, <code>SMTP_PASS</code> = password email itu. Kode
                dikirim ke <code>ADMIN_OTP_EMAIL</code> bila diisi.
              </li>
            </ul>
          ) : done ? (
            <p className="admin-success" role="status">
              Password berhasil diganti. Pakai password baru saat login
              berikutnya.
            </p>
          ) : null}
          {info.mail.length === 0 && !done && (
            <PasswordForm
              request={request}
              recipient={info.recipient}
              onDone={() => setDone(true)}
            />
          )}
          {done && (
            <button
              type="button"
              className="admin-button secondary"
              onClick={() => setDone(false)}
            >
              Ganti lagi
            </button>
          )}
        </>
      )}
    </section>
  );
}
