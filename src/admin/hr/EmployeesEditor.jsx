"use client";
import { useEffect, useState } from "react";
import { Field, shortDay } from "../fields.jsx";
import { employmentTypes, hrLimits, money } from "../../hr-model.js";

const blank = () => ({
  name: "",
  position: "",
  type: "tetap",
  joinDate: "",
  contractEnd: "",
  phone: "",
  email: "",
  nik: "",
  active: true,
  salary: {
    base: "",
    dailyRate: "",
    absentDeduction: "",
    allowances: [],
    deductions: [],
  },
  insurance: { bpjsKesehatan: false, bpjsKetenagakerjaan: false, other: "" },
  bank: { name: "", account: "", holder: "" },
  leaveDays: 12,
  notes: "",
});
const fromRecord = (e) => ({
  ...blank(),
  ...e,
  salary: { ...blank().salary, ...(e.salary ?? {}) },
  insurance: { ...blank().insurance, ...(e.insurance ?? {}) },
  bank: { ...blank().bank, ...(e.bank ?? {}) },
});

// Allowance or deduction lines: label and amount, up to hrLimits.lines.
function Lines({ label, value, onChange, addText }) {
  const update = (index, key, next) =>
    onChange(
      value.map((line, i) => (i === index ? { ...line, [key]: next } : line)),
    );
  return (
    <div className="admin-hr-lines">
      <p className="admin-hr-lines-title">{label}</p>
      {value.map((line, index) => (
        <div key={index} className="admin-hr-line">
          <input
            aria-label={`Nama ${label.toLowerCase()} ${index + 1}`}
            placeholder="Nama"
            maxLength={60}
            value={line.label}
            onChange={(e) => update(index, "label", e.target.value)}
          />
          <input
            aria-label={`Jumlah ${label.toLowerCase()} ${index + 1}`}
            type="number"
            min={0}
            step={1000}
            placeholder="Rp"
            value={line.amount}
            onChange={(e) => update(index, "amount", e.target.value)}
          />
          <button
            type="button"
            className="admin-inline danger"
            aria-label={`Hapus ${label.toLowerCase()} ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {value.length < hrLimits.lines && (
        <button
          type="button"
          className="admin-inline"
          onClick={() => onChange([...value, { label: "", amount: "" }])}
        >
          + {addText}
        </button>
      )}
    </div>
  );
}

// Pegawai: the staff list and one form for data, pay, insurance and bank.
export default function EmployeesEditor({ request }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    try {
      setList((await request("/api/admin/hr/employees")).employees);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const set = (key) => (event) =>
    setForm((f) => ({
      ...f,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  const setIn = (group, key) => (event) =>
    setForm((f) => ({
      ...f,
      [group]: {
        ...f[group],
        [key]:
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value,
      },
    }));
  function startEdit(employee) {
    setEditing(employee);
    setForm(fromRecord(employee));
    setError("");
    setNotice("");
    document
      .getElementById("employee-form")
      ?.scrollIntoView({ block: "start" });
  }
  function cancel() {
    setEditing(null);
    setForm(blank());
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
  const submit = (event) => {
    event.preventDefault();
    const name = form.name;
    return editing
      ? act(async () => {
          await request(`/api/admin/hr/employees/${editing.id}`, "PUT", form);
          cancel();
        }, `Data ${name} sudah diperbarui.`)
      : act(async () => {
          await request("/api/admin/hr/employees", "POST", form);
          setForm(blank());
        }, `${name} sudah ditambahkan sebagai pegawai.`);
  };
  const toggle = (employee) =>
    act(
      () =>
        request(`/api/admin/hr/employees/${employee.id}`, "PUT", {
          active: employee.active === false,
        }),
      employee.active === false
        ? `${employee.name} aktif kembali.`
        : `${employee.name} dinonaktifkan; tidak masuk absensi dan slip gaji baru.`,
    );
  const remove = (employee) =>
    act(async () => {
      await request(`/api/admin/hr/employees/${employee.id}`, "DELETE");
      setRemoving(null);
      if (editing?.id === employee.id) cancel();
    }, `${employee.name} sudah dihapus.`);
  const shown = (list ?? []).filter((e) => showInactive || e.active !== false);
  const daily = form.type === "harian";
  return (
    <div className="admin-hr">
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
          <div>
            <h2>Pegawai</h2>
            <p className="admin-subtle">
              {list
                ? `${list.filter((e) => e.active !== false).length} aktif · ${list.filter((e) => e.active === false).length} nonaktif`
                : "Memuat…"}
            </p>
          </div>
          <div className="admin-hr-tools">
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Tampilkan nonaktif
            </label>
            <a
              className="admin-button secondary"
              href="/api/admin/hr/export?kind=employees"
            >
              Unduh Excel
            </a>
          </div>
        </div>
        {!list ? (
          <p className="admin-empty">Memuat pegawai…</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>Jenis</th>
                  <th>Mulai</th>
                  <th>Gaji</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name}</strong>
                      {e.phone && <small>{e.phone}</small>}
                    </td>
                    <td>{e.position}</td>
                    <td>{employmentTypes[e.type]}</td>
                    <td>
                      {shortDay(e.joinDate)}
                      {e.contractEnd && (
                        <small>s/d {shortDay(e.contractEnd)}</small>
                      )}
                    </td>
                    <td>
                      {e.type === "harian"
                        ? `${money(e.salary?.dailyRate)} / hari`
                        : money(e.salary?.base)}
                      {(e.salary?.allowances?.length ?? 0) > 0 && (
                        <small>+ {e.salary.allowances.length} tunjangan</small>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          "admin-user-state " +
                          (e.active === false ? "is-off" : "is-on")
                        }
                      >
                        {e.active === false ? "Nonaktif" : "Aktif"}
                      </span>
                    </td>
                    <td className="admin-user-actions">
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() => startEdit(e)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() => toggle(e)}
                      >
                        {e.active === false ? "Aktifkan" : "Nonaktifkan"}
                      </button>
                      {removing === e.id ? (
                        <>
                          <button
                            type="button"
                            className="admin-inline danger"
                            disabled={busy}
                            onClick={() => remove(e)}
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
                          onClick={() => setRemoving(e.id)}
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={7}>
                      <small>Belum ada pegawai. Tambahkan di bawah.</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card" id="employee-form">
        <h2>{editing ? `Ubah pegawai: ${editing.name}` : "Tambah pegawai"}</h2>
        <form onSubmit={submit} className="admin-hr-form">
          <h3>Data pegawai</h3>
          <div className="admin-form-grid">
            <Field label="Nama lengkap">
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={set("name")}
              />
            </Field>
            <Field label="Jabatan">
              <input
                required
                maxLength={60}
                placeholder="Divemaster, instruktur, kapten, admin…"
                value={form.position}
                onChange={set("position")}
              />
            </Field>
            <Field label="Jenis kepegawaian">
              <select value={form.type} onChange={set("type")}>
                {Object.entries(employmentTypes).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mulai bekerja">
              <input
                type="date"
                required
                value={form.joinDate}
                onChange={set("joinDate")}
              />
            </Field>
            <Field label="Akhir kontrak (opsional)">
              <input
                type="date"
                value={form.contractEnd}
                onChange={set("contractEnd")}
              />
            </Field>
            <Field label="Nomor WhatsApp">
              <input
                maxLength={30}
                placeholder="+62 …"
                value={form.phone}
                onChange={set("phone")}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                maxLength={120}
                value={form.email}
                onChange={set("email")}
              />
            </Field>
            <Field label="NIK (16 angka, opsional)">
              <input
                inputMode="numeric"
                maxLength={16}
                value={form.nik}
                onChange={set("nik")}
              />
            </Field>
          </div>

          <h3>Gaji dan tunjangan</h3>
          <div className="admin-form-grid">
            {daily ? (
              <Field
                label="Upah per hari hadir"
                hint="Slip gaji = upah harian × hari hadir pada bulan itu."
              >
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.salary.dailyRate}
                  onChange={setIn("salary", "dailyRate")}
                />
              </Field>
            ) : (
              <>
                <Field label="Gaji pokok per bulan">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.salary.base}
                    onChange={setIn("salary", "base")}
                  />
                </Field>
                <Field
                  label="Potongan per hari tanpa keterangan"
                  hint="0 bila tidak ada potongan alpa."
                >
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.salary.absentDeduction}
                    onChange={setIn("salary", "absentDeduction")}
                  />
                </Field>
              </>
            )}
            <Field label="Jatah cuti per tahun (hari)">
              <input
                type="number"
                min={0}
                max={60}
                value={form.leaveDays}
                onChange={set("leaveDays")}
              />
            </Field>
          </div>
          <div className="admin-form-grid">
            <Lines
              label="Tunjangan tetap"
              addText="Tambah tunjangan"
              value={form.salary.allowances}
              onChange={(allowances) =>
                setForm((f) => ({ ...f, salary: { ...f.salary, allowances } }))
              }
            />
            <Lines
              label="Potongan tetap"
              addText="Tambah potongan"
              value={form.salary.deductions}
              onChange={(deductions) =>
                setForm((f) => ({ ...f, salary: { ...f.salary, deductions } }))
              }
            />
          </div>

          <h3>Asuransi dan rekening</h3>
          <div className="admin-hr-checks">
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={form.insurance.bpjsKesehatan}
                onChange={setIn("insurance", "bpjsKesehatan")}
              />
              BPJS Kesehatan
            </label>
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={form.insurance.bpjsKetenagakerjaan}
                onChange={setIn("insurance", "bpjsKetenagakerjaan")}
              />
              BPJS Ketenagakerjaan
            </label>
          </div>
          <div className="admin-form-grid">
            <Field label="Asuransi lain (opsional)">
              <input
                maxLength={120}
                value={form.insurance.other}
                onChange={setIn("insurance", "other")}
              />
            </Field>
            <Field label="Bank">
              <input
                maxLength={40}
                placeholder="BRI, BNI, Mandiri…"
                value={form.bank.name}
                onChange={setIn("bank", "name")}
              />
            </Field>
            <Field label="Nomor rekening">
              <input
                inputMode="numeric"
                maxLength={34}
                value={form.bank.account}
                onChange={setIn("bank", "account")}
              />
            </Field>
            <Field label="Nama pemilik rekening">
              <input
                maxLength={80}
                value={form.bank.holder}
                onChange={setIn("bank", "holder")}
              />
            </Field>
          </div>
          <Field label="Catatan">
            <textarea
              rows={2}
              maxLength={hrLimits.note}
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>
          {editing && (
            <label className="admin-login-show">
              <input
                type="checkbox"
                checked={form.active}
                onChange={set("active")}
              />
              Pegawai aktif
            </label>
          )}
          <div className="admin-user-buttons">
            <button className="admin-button" disabled={busy}>
              {busy
                ? "Memproses…"
                : editing
                  ? "Simpan perubahan"
                  : "Simpan pegawai"}
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
    </div>
  );
}
