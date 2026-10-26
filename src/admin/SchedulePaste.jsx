"use client";
import { useId, useState } from "react";
import {
  bookingPrograms,
  programTitle,
  statuses,
  sources,
} from "../cms-model.js";
import { readSchedule, scheduleDates } from "../schedule-paste.js";

// A schedule pasted from WhatsApp or a note, one trip a line, saved as
// reservations at once after a check (src/schedule-paste.js). Each line
// can be changed or left out first. A trip already in the calendar with
// the same dates and size starts unticked, so pasting twice adds nothing.
export default function SchedulePaste({
  bookings,
  content,
  today,
  request,
  onSaved,
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("confirmed");
  const [source, setSource] = useState("whatsapp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const already = (row) =>
    bookings.some(
      (b) =>
        b.status !== "cancelled" &&
        b.startDate === row.startDate &&
        b.endDate === row.endDate &&
        Number(b.participants) === row.participants,
    );
  function read(value) {
    setText(value);
    setError("");
    setRows(
      readSchedule(value, today).map((row) =>
        row.error
          ? row
          : { ...row, save: !already(row), duplicate: already(row) },
      ),
    );
  }
  const change = (index, patch) =>
    setRows((list) =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const chosen = rows.filter((row) => !row.error && row.save);
  async function saveAll() {
    setBusy(true);
    setError("");
    const done = new Set();
    try {
      for (const row of chosen) {
        await request("/api/admin/bookings", "POST", {
          experience: row.experience,
          status,
          source,
          startDate: row.startDate,
          endDate: row.endDate,
          guestName: row.guestName,
          phone: "",
          participants: Number(row.participants),
          amount: 0,
          notes: `Dari jadwal yang ditempel. ${row.line}`.slice(0, 2000),
          email: "",
          lang: "id",
        });
        done.add(row);
      }
      setText("");
      setRows([]);
    } catch (e) {
      setRows((list) => list.filter((row) => !done.has(row)));
      setError(
        `${done.size} reservasi tersimpan, yang lain belum. ${e.message}`,
      );
    } finally {
      setBusy(false);
      if (done.size) onSaved?.(done.size);
    }
  }
  const field = (index, name) => `${id}-${name}-${index}`;
  return (
    <section className="admin-card admin-paste" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>Tempel jadwal</h2>
      <p className="admin-subtle">
        Tidak perlu mengetik satu per satu. Tempel jadwal dari WhatsApp atau
        catatan, satu trip per baris. Tanggal, jumlah peserta, dan nama grup
        dibaca sendiri. Periksa hasilnya, lalu simpan semuanya sekaligus.
      </p>
      <textarea
        aria-label="Jadwal yang ditempel"
        rows={6}
        maxLength={6000}
        placeholder={
          "29 Okt sd 01 Nov (12 Divers)\n15-19 Nov (2 Divers)\n30 Nov - 05 Des (2 Divers) Keluarga Budi"
        }
        value={text}
        onChange={(e) => read(e.target.value)}
      />
      {rows.length > 0 && (
        <>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor={`${id}-status`}>Status untuk semua</label>
              <select
                id={`${id}-status`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {Object.entries(statuses)
                  .filter(([key]) => key !== "closed")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor={`${id}-source`}>Sumber untuk semua</label>
              <select
                id={`${id}-source`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {Object.entries(sources).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="admin-paste-rows">
            {rows.map((row, index) =>
              row.error ? (
                <li key={index} className="is-error">
                  <strong>{row.line}</strong>
                  <small>{row.error} Baris ini dilewati.</small>
                </li>
              ) : (
                <li key={index} className={row.save ? "" : "is-off"}>
                  <label className="admin-paste-check">
                    <input
                      type="checkbox"
                      checked={row.save}
                      aria-label={`Simpan baris ${index + 1}`}
                      onChange={(e) =>
                        change(index, { save: e.target.checked })
                      }
                    />
                    <span>
                      <strong>
                        {row.endDate >= row.startDate
                          ? scheduleDates(row.startDate, row.endDate)
                          : "Tanggal selesai lebih awal dari tanggal mulai"}
                      </strong>
                      <small>{row.line}</small>
                    </span>
                  </label>
                  <div className="admin-paste-fields">
                    <div className="admin-field">
                      <label htmlFor={field(index, "start")}>
                        Mulai baris {index + 1}
                      </label>
                      <input
                        id={field(index, "start")}
                        type="date"
                        value={row.startDate}
                        onChange={(e) =>
                          change(index, {
                            startDate: e.target.value,
                            warning: "",
                          })
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label htmlFor={field(index, "end")}>
                        Selesai baris {index + 1}
                      </label>
                      <input
                        id={field(index, "end")}
                        type="date"
                        value={row.endDate}
                        onChange={(e) =>
                          change(index, {
                            endDate: e.target.value,
                            warning: "",
                          })
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label htmlFor={field(index, "kind")}>
                        Pengalaman baris {index + 1}
                      </label>
                      <select
                        id={field(index, "kind")}
                        value={row.experience}
                        onChange={(e) =>
                          change(index, { experience: e.target.value })
                        }
                      >
                        {bookingPrograms.map((key) => (
                          <option key={key} value={key}>
                            {programTitle(content, key)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label htmlFor={field(index, "people")}>
                        Peserta baris {index + 1}
                      </label>
                      <input
                        id={field(index, "people")}
                        type="number"
                        min={1}
                        max={100}
                        value={row.participants}
                        onChange={(e) =>
                          change(index, {
                            participants: Number(e.target.value) || "",
                          })
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label htmlFor={field(index, "name")}>
                        Nama grup baris {index + 1}
                      </label>
                      <input
                        id={field(index, "name")}
                        maxLength={120}
                        value={row.guestName}
                        onChange={(e) =>
                          change(index, { guestName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  {row.duplicate && (
                    <small className="is-warn">
                      Reservasi dengan tanggal dan jumlah peserta yang sama
                      sudah ada di kalender, jadi baris ini tidak dicentang.
                    </small>
                  )}
                  {row.warning && (
                    <small className="is-warn">{row.warning}</small>
                  )}
                </li>
              ),
            )}
          </ul>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="admin-button"
            type="button"
            disabled={
              busy ||
              !chosen.length ||
              chosen.some(
                (row) =>
                  !row.startDate ||
                  !row.endDate ||
                  row.endDate < row.startDate ||
                  !row.guestName.trim() ||
                  !row.participants,
              )
            }
            onClick={saveAll}
          >
            {busy ? "Menyimpan…" : `Simpan ${chosen.length} reservasi`}
          </button>
        </>
      )}
    </section>
  );
}
