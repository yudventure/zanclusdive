"use client";
import { useState } from "react";
import { matching, sameText } from "../spec-suggest.js";
import { useOutsideClose } from "./useOutsideClose.js";

// The values of the choice (Merah, Putih), as chips: one per variant. A
// value typed or picked from the ones the catalog uses for the same
// choice becomes a new variant; a chip opens its variant.
export function OptionValues({
  id,
  label,
  family,
  current,
  choices,
  canAdd,
  onAdd,
  onOpen,
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const names = family.map((p) => p.variant || "");
  const typed = text.trim();
  const shown = matching(
    choices.filter((c) => !names.some((n) => sameText(n, c))),
    typed,
  ).slice(0, 12);
  const isNew =
    typed &&
    !names.some((n) => sameText(n, typed)) &&
    !shown.some((c) => sameText(c, typed));
  function add(value) {
    if (!value || names.some((n) => sameText(n, value)) || !canAdd) return;
    onAdd(value);
    setText("");
  }
  return (
    <div className="admin-field">
      <label htmlFor={id}>Pilihan {label.toLocaleLowerCase("id")}</label>
      <div className="admin-combo" ref={ref}>
        <div className="admin-chips">
          {family
            .filter((p) => p.variant)
            .map((p) => (
              <button
                type="button"
                key={p.id}
                className={
                  "admin-chip is-link" + (p.id === current ? " is-current" : "")
                }
                aria-current={p.id === current ? "true" : undefined}
                onClick={() => onOpen(p.id)}
              >
                {p.variant}
              </button>
            ))}
          <input
            id={id}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && (shown.length > 0 || Boolean(isNew))}
            aria-controls={`${id}-list`}
            autoComplete="off"
            maxLength={40}
            disabled={!canAdd}
            placeholder={
              names.some(Boolean)
                ? "Tambah pilihan, lalu Enter"
                : "Misalnya Merah, lalu Enter"
            }
            value={text}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              if (/,\s?$/.test(e.target.value) && typed) {
                add(typed.replace(/,$/, "").trim());
                return;
              }
              setText(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(typed);
              } else if (e.key === "Escape") setOpen(false);
            }}
          />
        </div>
        {open && (shown.length > 0 || isNew) && (
          <ul className="admin-combo-list" id={`${id}-list`} role="listbox">
            {shown.map((choice) => (
              <li
                key={choice}
                role="option"
                aria-selected="false"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => add(choice)}
              >
                {choice}
              </li>
            ))}
            {isNew && (
              <li
                role="option"
                aria-selected="false"
                className="is-new"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => add(typed)}
              >
                Tambah “{typed}”
              </li>
            )}
          </ul>
        )}
      </div>
      <small className="admin-subtle">
        {names.some(Boolean)
          ? "Pilihan baru langsung jadi varian baru di tabel bawah, dengan harga dan ukuran yang sama. Klik pilihan untuk membuka variannya."
          : "Pilihan pertama menjadi nama varian produk ini, berikutnya jadi varian baru."}
      </small>
    </div>
  );
}
