"use client";
import { useEffect, useState } from "react";
import { Field } from "../fields.jsx";
import {
  incomeCategories,
  expenseCategories,
  money,
} from "../../finance-model.js";

const monthName = (month) =>
  new Date(month + "-01T12:00:00").toLocaleDateString("id-ID", {
    month: "short",
  });

// Laba rugi & pajak: twelve months, the categories, and the tax recap.
export default function ReportsEditor({ request, today }) {
  const [year, setYear] = useState(today.slice(0, 4));
  const [report, setReport] = useState(null);
  const [tax, setTax] = useState({ taxRate: "", taxLabel: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load(which = year) {
    try {
      const next = await request(`/api/admin/finance/report?year=${which}`);
      setReport(next);
      setTax({ taxRate: String(next.taxRate), taxLabel: next.taxLabel });
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    setReport(null);
    load(year);
  }, [year]);
  async function saveTax(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request("/api/admin/finance/report", "PUT", tax);
      await load();
      setNotice("Pengaturan pajak tersimpan.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const sumOf = (group, key) =>
    report?.months.reduce((t, m) => t + m[group][key], 0) ?? 0;
  const activeMonths =
    report?.months.filter((m) => m.income || m.expense) ?? [];
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
        <div className="admin-month-nav">
          <button
            type="button"
            className="admin-round"
            aria-label="Tahun lalu"
            onClick={() => setYear(String(Number(year) - 1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="admin-round"
            aria-label="Tahun berikut"
            onClick={() => setYear(String(Number(year) + 1))}
          >
            ›
          </button>
          <h2>Tahun {year}</h2>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/finance/export?kind=report&year=${year}`}
          >
            Unduh Excel
          </a>
        </div>
        {!report ? (
          <p className="admin-empty">Menghitung laba rugi…</p>
        ) : (
          <>
            <div className="admin-stat-strip">
              <div className="is-in">
                <small>Pemasukan</small>
                <strong>{money(report.income)}</strong>
              </div>
              <div className="is-out">
                <small>Pengeluaran</small>
                <strong>{money(report.expense)}</strong>
              </div>
              <div className={report.net < 0 ? "is-out" : "is-net"}>
                <small>Laba bersih</small>
                <strong>{money(report.net)}</strong>
              </div>
              <div className="is-tax">
                <small>{report.taxLabel}</small>
                <strong>{money(report.tax)}</strong>
              </div>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table admin-hr-table admin-report">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Pemasukan</th>
                    <th>Pengeluaran</th>
                    <th>Laba</th>
                    <th>Pajak</th>
                  </tr>
                </thead>
                <tbody>
                  {report.months.map((m) => (
                    <tr
                      key={m.month}
                      className={m.income || m.expense ? "" : "is-quiet"}
                    >
                      <td>
                        <strong>{monthName(m.month)}</strong>
                      </td>
                      <td className="is-amount">{money(m.income)}</td>
                      <td className="is-amount">{money(m.expense)}</td>
                      <td
                        className={
                          "is-amount" + (m.net < 0 ? " is-negative" : "")
                        }
                      >
                        {money(m.net)}
                      </td>
                      <td className="is-amount">{money(m.tax)}</td>
                    </tr>
                  ))}
                  <tr className="admin-payroll-total">
                    <td>
                      <strong>Total {year}</strong>
                      <small>{activeMonths.length} bulan ada catatan</small>
                    </td>
                    <td className="is-amount">
                      <strong>{money(report.income)}</strong>
                    </td>
                    <td className="is-amount">
                      <strong>{money(report.expense)}</strong>
                    </td>
                    <td className="is-amount">
                      <strong>{money(report.net)}</strong>
                    </td>
                    <td className="is-amount">
                      <strong>{money(report.tax)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {report && (
        <div className="admin-two-column">
          <section className="admin-card">
            <h2>Pemasukan per kategori</h2>
            <table className="admin-table admin-hr-table">
              <tbody>
                {Object.entries(incomeCategories).map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td className="is-amount">{money(sumOf("in", key))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="admin-card">
            <h2>Pengeluaran per kategori</h2>
            <table className="admin-table admin-hr-table">
              <tbody>
                {Object.entries(expenseCategories).map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td className="is-amount">{money(sumOf("out", key))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      <section className="admin-card">
        <h2>Rekap pajak</h2>
        <p className="admin-subtle">
          Pajak dihitung dari pemasukan kotor tiap bulan. Bawaannya PPh final
          UMKM 0,5% (PP 55/2022); ubah bila usaha memakai tarif lain. Ini
          perkiraan untuk setoran, bukan pengganti perhitungan konsultan pajak.
        </p>
        <form onSubmit={saveTax} className="admin-hr-form">
          <div className="admin-form-grid">
            <Field label="Tarif pajak (% dari pemasukan)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                required
                value={tax.taxRate}
                onChange={(e) =>
                  setTax((t) => ({ ...t, taxRate: e.target.value }))
                }
              />
            </Field>
            <Field label="Nama pajak">
              <input
                maxLength={60}
                value={tax.taxLabel}
                onChange={(e) =>
                  setTax((t) => ({ ...t, taxLabel: e.target.value }))
                }
              />
            </Field>
          </div>
          <button className="admin-button" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan pengaturan pajak"}
          </button>
        </form>
      </section>
    </div>
  );
}
