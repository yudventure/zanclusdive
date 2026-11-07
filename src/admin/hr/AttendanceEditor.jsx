"use client";
import { useEffect, useState } from "react";
import { MonthNav, dayLabel } from "../fields.jsx";
import {
  attendanceStatuses,
  attendanceSummary,
  hrLimits,
} from "../../hr-model.js";

const blankRow = () => ({ status: "hadir", timeIn: "", timeOut: "", note: "" });
const keys = Object.keys(attendanceStatuses);

// Absensi: one day for every active employee, and the month's totals.
export default function AttendanceEditor({ request, today }) {
  const [employees, setEmployees] = useState(null);
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [records, setRecords] = useState([]);
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function loadMonth(which) {
    const result = await request(`/api/admin/hr/attendance?month=${which}`);
    setRecords(result.records);
    return result.records;
  }
  useEffect(() => {
    request("/api/admin/hr/employees")
      .then((result) => setEmployees(result.employees))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    loadMonth(month).catch((e) => setError(e.message));
  }, [month]);
  // The day's rows come from what was saved, else everyone present.
  useEffect(() => {
    if (!employees) return;
    const dayMonth = date.slice(0, 7);
    const fill = (list) =>
      setRows(
        Object.fromEntries(
          employees
            .filter((e) => e.active !== false)
            .map((e) => {
              const saved = list.find(
                (r) => r.employeeId === e.id && r.date === date,
              );
              return [
                e.id,
                saved
                  ? {
                      status: saved.status,
                      timeIn: saved.timeIn,
                      timeOut: saved.timeOut,
                      note: saved.note,
                    }
                  : blankRow(),
              ];
            }),
        ),
      );
    if (dayMonth === month) fill(records);
    else
      request(`/api/admin/hr/attendance?month=${dayMonth}`)
        .then((result) => fill(result.records))
        .catch((e) => setError(e.message));
  }, [employees, date, records]);
  const active = (employees ?? []).filter((e) => e.active !== false);
  const setRow = (id, key, value) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], [key]: value } }));
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request("/api/admin/hr/attendance", "POST", {
        date,
        rows: active.map((e) => ({ employeeId: e.id, ...rows[e.id] })),
      });
      if (date.slice(0, 7) !== month) setMonth(date.slice(0, 7));
      else await loadMonth(month);
      setNotice(
        `Absensi ${dayLabel(date)} tersimpan untuk ${active.length} pegawai.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const savedToday = records.some((r) => r.date === date);
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
        <form onSubmit={save}>
          <div className="admin-card-heading">
            <div>
              <h2>Absensi harian</h2>
              <p className="admin-subtle">
                {dayLabel(date)}
                {savedToday ? " · sudah tersimpan, bisa diubah" : ""}
              </p>
            </div>
            <div className="admin-hr-tools">
              <input
                type="date"
                aria-label="Tanggal absensi"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
              <button
                type="button"
                className="admin-button secondary"
                onClick={() =>
                  setRows((r) =>
                    Object.fromEntries(
                      Object.entries(r).map(([id, row]) => [
                        id,
                        { ...row, status: "hadir" },
                      ]),
                    ),
                  )
                }
              >
                Semua hadir
              </button>
            </div>
          </div>
          {!employees ? (
            <p className="admin-empty">Memuat pegawai…</p>
          ) : !active.length ? (
            <p className="admin-empty">
              Belum ada pegawai aktif. Tambahkan di halaman Pegawai.
            </p>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table admin-hr-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Status</th>
                    <th>Masuk</th>
                    <th>Pulang</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((e) => {
                    const row = rows[e.id] ?? blankRow();
                    const present = row.status === "hadir";
                    return (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                          <small>{e.position}</small>
                        </td>
                        <td>
                          <select
                            aria-label={`Status ${e.name}`}
                            value={row.status}
                            onChange={(ev) =>
                              setRow(e.id, "status", ev.target.value)
                            }
                          >
                            {keys.map((key) => (
                              <option key={key} value={key}>
                                {attendanceStatuses[key]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            aria-label={`Jam masuk ${e.name}`}
                            value={row.timeIn}
                            disabled={!present}
                            onChange={(ev) =>
                              setRow(e.id, "timeIn", ev.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            aria-label={`Jam pulang ${e.name}`}
                            value={row.timeOut}
                            disabled={!present}
                            onChange={(ev) =>
                              setRow(e.id, "timeOut", ev.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Catatan ${e.name}`}
                            maxLength={hrLimits.note}
                            value={row.note}
                            onChange={(ev) =>
                              setRow(e.id, "note", ev.target.value)
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {active.length > 0 && (
            <button className="admin-button" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan absensi"}
            </button>
          )}
        </form>
      </section>

      <section className="admin-card">
        <MonthNav month={month} onChange={setMonth}>
          <a
            className="admin-button secondary admin-hr-export"
            href={`/api/admin/hr/export?kind=attendance&month=${month}`}
          >
            Unduh Excel
          </a>
        </MonthNav>
        <div className="admin-table-scroll">
          <table className="admin-table admin-hr-table">
            <thead>
              <tr>
                <th>Nama</th>
                {keys.map((key) => (
                  <th key={key}>{attendanceStatuses[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((e) => {
                const days = attendanceSummary(records, e.id, month);
                return (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name}</strong>
                    </td>
                    {keys.map((key) => (
                      <td key={key}>{days[key] || "–"}</td>
                    ))}
                  </tr>
                );
              })}
              {!active.length && (
                <tr>
                  <td colSpan={keys.length + 1}>
                    <small>Belum ada pegawai aktif.</small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
