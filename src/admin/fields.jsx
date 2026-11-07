"use client";
import { cloneElement, useId } from "react";

// A labelled form control for the admin editors.
export function Field({ label, hint, children, className = "" }) {
  const id = useId();
  return (
    <div className={"admin-field " + className}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
      {hint && <small className="admin-subtle">{hint}</small>}
    </div>
  );
}
export const monthLabel = (month) =>
  new Date(month + "-01T12:00:00").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
export const dayLabel = (date) =>
  new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export const shortDay = (date) =>
  date
    ? new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
export function moveMonth(month, delta) {
  const d = new Date(month + "-01T12:00:00");
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// ‹ Bulan › with the month name, as on the reservation calendar.
export function MonthNav({ month, onChange, children }) {
  return (
    <div className="admin-month-nav">
      <button
        type="button"
        className="admin-round"
        aria-label="Bulan lalu"
        onClick={() => onChange(moveMonth(month, -1))}
      >
        ‹
      </button>
      <button
        type="button"
        className="admin-round"
        aria-label="Bulan berikut"
        onClick={() => onChange(moveMonth(month, 1))}
      >
        ›
      </button>
      <h2>{monthLabel(month)}</h2>
      {children}
    </div>
  );
}
