"use client";
import { cloneElement, useEffect, useId, useState } from "react";
import { areas, roles, roleKeys, roleLabel } from "../roles.js";

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
const blank = { name: "", email: "", role: "pr", password: "", active: true };
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

// Pengguna & peran: staff accounts, each with one role. Built-in accounts
// from the hosting panel are listed but managed there.
export default function UsersEditor({ request, account }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    try {
      setList(await request("/api/admin/users"));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const set = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  function startEdit(user) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      active: user.active,
    });
    setNotice("");
    setError("");
    document.getElementById("user-form")?.scrollIntoView({ block: "start" });
  }
  function cancel() {
    setEditing(null);
    setForm(blank);
    setError("");
  }
  async function act(work, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await load();
      setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (editing)
      await act(async () => {
        await request(`/api/admin/users/${editing.id}`, "PUT", {
          name: form.name,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        cancel();
      }, `Pengguna ${form.name} sudah diperbarui.`);
    else
      await act(
        async () => {
          await request("/api/admin/users", "POST", form);
          setForm(blank);
        },
        `Pengguna ${form.name || form.email} sudah dibuat. Beri tahu password awalnya; ia bisa menggantinya di Ubah password.`,
      );
  }
  const toggle = (user) =>
    act(
      () =>
        request(`/api/admin/users/${user.id}`, "PUT", {
          active: !user.active,
        }),
      user.active
        ? `${user.name} dinonaktifkan; sesinya berakhir.`
        : `${user.name} aktif kembali.`,
    );
  const remove = (user) =>
    act(async () => {
      await request(`/api/admin/users/${user.id}`, "DELETE");
      setRemoving(null);
      if (editing?.id === user.id) cancel();
    }, `Pengguna ${user.name} sudah dihapus.`);
  const own = (user) =>
    user.email.toLowerCase() === account.email.toLowerCase();
  return (
    <div className="admin-users">
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      <section className="admin-card">
        <div className="admin-card-heading">
          <h2>Pengguna</h2>
          <p className="admin-subtle">
            Setiap orang masuk dengan email dan password sendiri, dan hanya
            melihat menu perannya.
          </p>
        </div>
        {!list ? (
          <p className="admin-empty">Memuat pengguna…</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-user-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.builtIn.map((user) => (
                  <tr key={"base:" + user.email}>
                    <td>
                      <strong>Akun bawaan</strong>
                      <small>Dari hPanel / kode</small>
                    </td>
                    <td>{user.email}</td>
                    <td>{roleLabel(user.role)}</td>
                    <td>
                      <span className="admin-user-state is-on">Aktif</span>
                    </td>
                    <td>
                      <small>Diatur di hPanel</small>
                    </td>
                  </tr>
                ))}
                {list.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      {own(user) && <small>Akun Anda</small>}
                      {!own(user) && user.createdAt && (
                        <small>Dibuat {dateLabel(user.createdAt)}</small>
                      )}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.roleLabel}</td>
                    <td>
                      <span
                        className={
                          "admin-user-state " +
                          (user.active ? "is-on" : "is-off")
                        }
                      >
                        {user.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="admin-user-actions">
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() => startEdit(user)}
                      >
                        Ubah
                      </button>
                      {!own(user) && (
                        <>
                          <button
                            type="button"
                            className="admin-inline"
                            disabled={busy}
                            onClick={() => toggle(user)}
                          >
                            {user.active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          {removing === user.id ? (
                            <>
                              <button
                                type="button"
                                className="admin-inline danger"
                                disabled={busy}
                                onClick={() => remove(user)}
                              >
                                Yakin, hapus
                              </button>
                              <button
                                type="button"
                                className="admin-inline"
                                onClick={() => setRemoving(null)}
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="admin-inline danger"
                              disabled={busy}
                              onClick={() => setRemoving(user.id)}
                            >
                              Hapus
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!list.users.length && (
                  <tr>
                    <td colSpan={5}>
                      <small>
                        Belum ada pengguna tambahan. Tambahkan di bawah.
                      </small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card" id="user-form">
        <h2>
          {editing ? `Ubah pengguna: ${editing.name}` : "Tambah pengguna"}
        </h2>
        <form onSubmit={submit} className="admin-user-form">
          <Field label="Nama">
            <input
              name="name"
              required
              maxLength={60}
              value={form.name}
              onChange={set("name")}
            />
          </Field>
          <Field
            label="Email login"
            hint={
              editing
                ? "Email tidak bisa diubah; buat pengguna baru bila perlu."
                : "Kode OTP untuk ganti password dikirim ke email ini."
            }
          >
            <input
              name="email"
              type="email"
              required
              maxLength={200}
              value={form.email}
              onChange={set("email")}
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Peran" hint={roles[form.role]?.who}>
            <select
              name="role"
              value={form.role}
              onChange={set("role")}
              disabled={Boolean(editing && own(editing))}
            >
              {roleKeys.map((key) => (
                <option key={key} value={key}>
                  {roles[key].label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              editing ? "Password baru (kosongkan bila tetap)" : "Password awal"
            }
            hint="Minimal 10 karakter."
          >
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required={!editing}
              minLength={10}
              maxLength={200}
              value={form.password}
              onChange={set("password")}
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
          {editing && !own(editing) && (
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={form.active}
                onChange={set("active")}
              />
              Akun aktif
            </label>
          )}
          <div className="admin-user-buttons">
            <button className="admin-button" disabled={busy}>
              {busy
                ? "Memproses…"
                : editing
                  ? "Simpan perubahan"
                  : "Simpan pengguna"}
            </button>
            {editing && (
              <button
                type="button"
                className="admin-button secondary"
                onClick={cancel}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Peran dan menu yang dilihat</h2>
        <div className="admin-role-grid">
          {roleKeys.map((key) => (
            <div key={key} className="admin-role-card is-static">
              <strong>{roles[key].label}</strong>
              <span>{roles[key].who}</span>
              <ul>
                {roles[key].areas.map((area) => (
                  <li key={area}>{areas[area]}</li>
                ))}
                <li>Ubah password sendiri</li>
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
