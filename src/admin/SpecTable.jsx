"use client";
import { useId, useState } from "react";
import { productLimits } from "../shop-model.js";
import {
  joinValues,
  labelChoices,
  matching,
  quickSpecLabels,
  sameText,
  splitValues,
  valueChoices,
} from "../spec-suggest.js";
import { useOutsideClose } from "./useOutsideClose.js";

// A list of choices under a text field, searched by what is typed, picked
// with a tap or the arrow keys and Enter. "extra" is an option added at
// the end, such as adding the words typed as a new value.
function Choices({ id, open, options, active, onPick, extra }) {
  if (!open || (!options.length && !extra)) return null;
  return (
    <ul className="admin-combo-list" id={id} role="listbox">
      {options.map((option, index) => (
        <li
          key={option}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === active}
          className={index === active ? "is-active" : ""}
          // The field keeps its focus while an option is picked.
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onPick(option)}
        >
          {option}
        </li>
      ))}
      {extra && (
        <li
          id={`${id}-${options.length}`}
          role="option"
          aria-selected={active === options.length}
          className={"is-new" + (active === options.length ? " is-active" : "")}
          onPointerDown={(e) => e.preventDefault()}
          onClick={extra.pick}
        >
          {extra.label}
        </li>
      )}
    </ul>
  );
}

// Arrow keys move through the choices, Enter picks, Escape closes.
function useChoiceKeys(count, pick, setOpen) {
  const [active, setActive] = useState(-1);
  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((i) =>
        count
          ? (i + (event.key === "ArrowDown" ? 1 : count - 1) + count) % count
          : -1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(active);
      setActive(-1);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }
  return { active, setActive, onKeyDown };
}

// The row's name: typed freely, or picked from the names the catalog and
// the presets offer, searched as it is typed.
function LabelField({ id, label, value, choices, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const shown = matching(choices, value)
    .filter((choice) => !sameText(choice, value))
    .slice(0, 12);
  const keys = useChoiceKeys(
    shown.length,
    (index) => {
      if (shown[index]) onChange(shown[index]);
      setOpen(false);
    },
    setOpen,
  );
  return (
    <div className="admin-combo" ref={ref}>
      <input
        id={id}
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && shown.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={
          keys.active >= 0 ? `${id}-list-${keys.active}` : undefined
        }
        autoComplete="off"
        maxLength={40}
        placeholder="Pilih atau ketik, misalnya Merek"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          keys.setActive(-1);
        }}
        onKeyDown={keys.onKeyDown}
      />
      <Choices
        id={`${id}-list`}
        open={open}
        options={shown}
        active={keys.active}
        onPick={(option) => {
          onChange(option);
          setOpen(false);
        }}
      />
    </div>
  );
}

// The row's values as chips. A value other products use for the same name
// is picked from the list; a new one is typed and added with Enter. They
// are saved as one text, "Merah, Hitam".
function ValueChips({ id, label, values, choices, onChange }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const ref = useOutsideClose(open, () => setOpen(false));
  const typed = text.trim().replace(/,$/, "").trim();
  const shown = matching(
    choices.filter((choice) => !values.some((v) => sameText(v, choice))),
    typed,
  ).slice(0, 12);
  const isNew =
    typed &&
    !values.some((v) => sameText(v, typed)) &&
    !shown.some((choice) => sameText(choice, typed));
  function add(value) {
    const next = [...values, value];
    if (joinValues(next).length > 160) {
      setError("Isi satu baris maksimal 160 karakter.");
      return;
    }
    onChange(next);
    setText("");
    setError("");
  }
  const keys = useChoiceKeys(
    shown.length + (isNew ? 1 : 0),
    (index) => {
      if (shown[index]) add(shown[index]);
      else if (typed && !values.some((v) => sameText(v, typed))) add(typed);
    },
    setOpen,
  );
  return (
    <div className="admin-combo" ref={ref}>
      <div
        className="admin-chips"
        onPointerDown={(e) => {
          // A tap on the box, not on a chip, goes to the field.
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.currentTarget.querySelector("input")?.focus();
          }
        }}
      >
        {values.map((value, index) => (
          <span className="admin-chip" key={value + index}>
            {value}
            <button
              type="button"
              aria-label={`Hapus ${value}`}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && (shown.length > 0 || Boolean(isNew))}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            keys.active >= 0 ? `${id}-list-${keys.active}` : undefined
          }
          autoComplete="off"
          maxLength={160}
          placeholder={
            values.length ? "Tambah lagi" : "Pilih atau ketik isinya"
          }
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            // A comma and a space add what was typed before them.
            if (/,\s$/.test(e.target.value) && typed) {
              add(typed);
              return;
            }
            setText(e.target.value);
            setOpen(true);
            setError("");
            keys.setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !text && values.length) {
              onChange(values.slice(0, -1));
              return;
            }
            keys.onKeyDown(e);
          }}
          // Words typed and left there are kept as a value.
          onBlur={() => {
            if (typed && !values.some((v) => sameText(v, typed))) add(typed);
          }}
        />
      </div>
      <Choices
        id={`${id}-list`}
        open={open}
        options={shown}
        active={keys.active}
        onPick={add}
        extra={
          isNew ? { label: `Tambah “${typed}”`, pick: () => add(typed) } : null
        }
      />
      {error && (
        <small className="admin-error-text" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

// The spec table of a product: rows of a name and its values, filled in
// from what the catalog already uses.
export default function SpecTable({ rows, catalog, onChange }) {
  const id = useId();
  const labels = labelChoices(catalog);
  const set = (index, patch) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const full = rows.length >= productLimits.specs;
  const quick = quickSpecLabels.filter(
    (label) => !rows.some((row) => sameText(row.label, label)),
  );
  return (
    <section className="admin-shop-specs" aria-label="Tabel spesifikasi">
      <h3>Tabel spesifikasi</h3>
      {rows.length > 0 && (
        <div className="admin-spec-head" aria-hidden="true">
          <span>Nama</span>
          <span>Isi</span>
        </div>
      )}
      {rows.map((row, index) => (
        <div className="admin-spec-row" key={index}>
          <LabelField
            id={`${id}-label-${index}`}
            label={`Nama ${index + 1}`}
            value={row.label}
            choices={labels}
            onChange={(label) => set(index, { label })}
          />
          <ValueChips
            id={`${id}-value-${index}`}
            label={`Isi ${index + 1}`}
            values={splitValues(row.value)}
            choices={valueChoices(catalog, row.label)}
            onChange={(values) => set(index, { value: joinValues(values) })}
          />
          <button
            type="button"
            className="admin-inline danger"
            aria-label={`Hapus baris spesifikasi ${index + 1}`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Hapus
          </button>
        </div>
      ))}
      <div className="admin-spec-add">
        <button
          type="button"
          className="admin-button secondary"
          disabled={full}
          onClick={() => onChange([...rows, { label: "", value: "" }])}
        >
          + Tambah baris
        </button>
        {quick.map((label) => (
          <button
            type="button"
            key={label}
            className="admin-spec-quick"
            disabled={full}
            onClick={() => onChange([...rows, { label, value: "" }])}
          >
            + {label}
          </button>
        ))}
      </div>
      <p className="admin-subtle">
        Nama dipilih dari daftar atau diketik baru. Isi yang sudah dipakai
        produk lain untuk nama yang sama tinggal dipilih, dan isi baru diketik
        lalu Enter. Satu baris bisa berisi beberapa isi, misalnya beberapa
        warna. Baris kosong diabaikan.
      </p>
    </section>
  );
}
