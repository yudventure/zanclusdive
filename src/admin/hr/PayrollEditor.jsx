"use client";
import { useEffect, useState } from "react";
import { MonthNav, monthLabel, shortDay } from "../fields.jsx";
import { employmentTypes, money } from "../../hr-model.js";

const sum = (lines) => lines.reduce((total, line) => total + line.amount, 0);

// Slip gaji: one payslip per active employee for the month, computed from
// the salary and attendance until it is locked as paid.
export default function PayrollEditor({ request, today }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [slips, setSlips] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load(which = month) {
    try {
      setSlips((await request(`/api/admin/hr/payroll?month=${which}`)).slips);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    setSlips(null);
    setSelected(null);
    load(month);
  }, [month]);
  async function change(slip, action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request("/api/admin/hr/payroll", "POST", {
        month,
        employeeId: slip.employeeId,
        action,
      });
      await load();
      setNotice(
        action === "lock"
          ? `Slip ${slip.name} ${monthLabel(month)} terkunci sebagai dibayar.`
          : `Slip ${slip.name} dibuka lagi dan mengikuti data terbaru.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const detail = slips?.find((s) => s.id === selected);
  const totals = (slips ?? []).reduce(
    (t, s) => ({ gross: t.gross + s.gross, net: t.net + s.net }),
    { gross: 0, net: 0 },
  );
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
        <MonthNav month={month} onChange={setMonth}>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/hr/export?kind=payroll&month=${month}`}
          >
            Unduh Excel
          </a>
        </MonthNav>
        {!slips ? (
          <p className="admin-empty">Menghitung slip gaji…</p>
        ) : !slips.length ? (
          <p className="admin-empty">
            Belum ada pegawai aktif. Tambahkan di halaman Pegawai.
          </p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-hr-table admin-payroll">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Hadir / alpa</th>
                  <th>Gaji pokok</th>
                  <th>Tunjangan</th>
                  <th>Potongan</th>
                  <th>Bersih</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((s) => (
                  <tr
                    key={s.id}
                    className={s.id === selected ? "is-selected" : ""}
                  >
                    <td>
                      <strong>{s.name}</strong>
                      <small>
                        {s.position} · {employmentTypes[s.type]}
                      </small>
                    </td>
                    <td>
                      {s.days.hadir} / {s.days.alpa}
                    </td>
                    <td>
                      {money(s.basePay)}
                      {s.type === "harian" && (
                        <small>
                          {s.days.hadir} hari × {money(s.dailyRate)}
                        </small>
                      )}
                    </td>
                    <td>{money(sum(s.allowances))}</td>
                    <td>{money(sum(s.deductions))}</td>
                    <td>
                      <strong>{money(s.net)}</strong>
                    </td>
                    <td>
                      <span
                        className={
                          "admin-user-state " + (s.locked ? "is-on" : "is-off")
                        }
                      >
                        {s.locked ? "Terkunci" : "Draf"}
                      </span>
                    </td>
                    <td className="admin-user-actions">
                      <button
                        type="button"
                        className="admin-inline"
                        onClick={() => setSelected(s.id)}
                      >
                        Lihat slip
                      </button>
                      <button
                        type="button"
                        className="admin-inline"
                        disabled={busy}
                        onClick={() => change(s, s.locked ? "unlock" : "lock")}
                      >
                        {s.locked ? "Buka" : "Kunci (dibayar)"}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="admin-payroll-total">
                  <td colSpan={5}>
                    <strong>Total {slips.length} pegawai</strong>
                    <small>Kotor {money(totals.gross)}</small>
                  </td>
                  <td>
                    <strong>{money(totals.net)}</strong>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-subtle">
          Slip draf mengikuti gaji dan absensi terbaru. Setelah dibayar, tekan
          Kunci supaya angkanya tidak berubah lagi.
        </p>
      </section>

      {detail && (
        <section className="admin-card admin-payslip">
          <div className="admin-card-heading">
            <div>
              <h2>Slip gaji {monthLabel(month)}</h2>
              <p className="admin-subtle">
                {detail.name} · {detail.position} ·{" "}
                {employmentTypes[detail.type]}
                {detail.locked &&
                  ` · Terkunci ${shortDay(detail.lockedAt?.slice(0, 10))}`}
              </p>
            </div>
            <button
              type="button"
              className="admin-inline"
              onClick={() => setSelected(null)}
            >
              Tutup
            </button>
          </div>
          <dl className="admin-payslip-lines">
            <div>
              <dt>
                {detail.type === "harian"
                  ? `Upah harian · ${detail.days.hadir} hari hadir`
                  : "Gaji pokok"}
              </dt>
              <dd>{money(detail.basePay)}</dd>
            </div>
            {detail.allowances.map((line, i) => (
              <div key={"a" + i}>
                <dt>Tunjangan · {line.label}</dt>
                <dd>{money(line.amount)}</dd>
              </div>
            ))}
            <div className="is-sum">
              <dt>Kotor</dt>
              <dd>{money(detail.gross)}</dd>
            </div>
            {detail.deductions.map((line, i) => (
              <div key={"d" + i} className="is-minus">
                <dt>Potongan · {line.label}</dt>
                <dd>− {money(line.amount)}</dd>
              </div>
            ))}
            <div className="is-net">
              <dt>Diterima bersih</dt>
              <dd>{money(detail.net)}</dd>
            </div>
          </dl>
          <p className="admin-subtle">
            Kehadiran: {detail.days.hadir} hadir · {detail.days.izin} izin ·{" "}
            {detail.days.sakit} sakit · {detail.days.cuti} cuti ·{" "}
            {detail.days.alpa} tanpa keterangan.
          </p>
        </section>
      )}
    </div>
  );
}
