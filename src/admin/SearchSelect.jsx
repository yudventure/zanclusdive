"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useOutsideClose } from "./useOutsideClose.js";

const key = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// A dropdown for long lists, searched as it is typed. The field shows the
// choice; typing searches the options' names, groups and notes, every word
// anywhere and without minding case or accents. Arrow keys and Enter
// pick, Escape closes, a tap outside closes. "options" are { value,
// label, note?, group?, disabled? }. A picker that adds what is picked
// (a package to a booking) passes "adds": the field empties again.
export default function SearchSelect({
  id,
  label,
  value = "",
  options,
  onChange,
  placeholder = "Ketik untuk mencari…",
  disabled,
  required,
  adds = false,
  limit = 80,
  className = "",
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  const listId = fieldId + "-list";
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useOutsideClose(open, () => setOpen(false));
  const chosen = adds ? null : options.find((o) => o.value === value);
  const words = key(query).split(/\s+/).filter(Boolean);
  const found = options.filter(
    (o) =>
      !o.disabled &&
      words.every((word) =>
        key(`${o.label} ${o.group ?? ""} ${o.note ?? ""}`).includes(word),
      ),
  );
  const shown = found.slice(0, limit);
  // A required field without a choice is refused by the form, also while
  // words are typed but nothing is picked.
  useEffect(() => {
    input.current?.setCustomValidity(
      required && !chosen ? "Pilih dari daftar." : "",
    );
  }, [required, chosen]);
  function start() {
    if (disabled) return;
    setQuery("");
    const at = shown.findIndex((o) => o.value === value);
    setActive(Math.max(0, at));
    setOpen(true);
  }
  function pick(option) {
    if (!option) return;
    onChange(option.value);
    setQuery("");
    setOpen(false);
    if (adds) input.current?.focus();
  }
  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return start();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) =>
        shown.length ? (i + step + shown.length) % shown.length : 0,
      );
    } else if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      pick(shown[active]);
    } else if (event.key === "Escape") {
      if (open) event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") setOpen(false);
  }
  // Group names shown once, above their first option.
  let lastGroup = null;
  return (
    <div
      className={"admin-search-select" + (className ? " " + className : "")}
      ref={ref}
    >
      <input
        ref={input}
        id={fieldId}
        aria-label={label}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && shown[active] ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        disabled={disabled}
        required={required}
        placeholder={chosen ? chosen.label : placeholder}
        value={open ? query : (chosen?.label ?? "")}
        onFocus={start}
        onClick={() => !open && start()}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="admin-search-list" id={listId} role="listbox">
          {shown.map((option, index) => {
            const head =
              option.group && option.group !== lastGroup ? option.group : null;
            lastGroup = option.group ?? lastGroup;
            return [
              head && (
                <li
                  key={"group-" + head}
                  role="presentation"
                  className="admin-search-group"
                >
                  {head}
                </li>
              ),
              <li
                key={index + ":" + option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={
                  (index === active ? "is-active" : "") +
                  (option.value === value ? " is-chosen" : "")
                }
                onPointerDown={(e) => e.preventDefault()}
                onPointerEnter={() => setActive(index)}
                onClick={() => pick(option)}
              >
                <span>{option.label}</span>
                {option.note && <small>{option.note}</small>}
              </li>,
            ];
          })}
          {!found.length && (
            <li role="presentation" className="admin-search-none">
              Tidak ada yang cocok dengan “{query.trim()}”.
            </li>
          )}
          {found.length > shown.length && (
            <li role="presentation" className="admin-search-none">
              {found.length - shown.length} lainnya, ketik untuk menyaring.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// The photos to pick from: the uploaded ones first, then the website's
// own. "builtIn" is [url, title] pairs.
export function photoOptions(media = [], builtIn = []) {
  const seen = new Set();
  return [
    ...media.map((m) => ({
      value: m.url,
      label: m.name,
      group: "Foto yang diunggah",
    })),
    ...builtIn.map(([url, title]) => ({
      value: url,
      label: title,
      group: "Foto bawaan website",
    })),
  ].filter((o) => !seen.has(o.value) && seen.add(o.value));
}
