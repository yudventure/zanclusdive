"use client";
import { useId, useRef, useState } from "react";
import { AdminIcon } from "./icons.jsx";

// One-tap photo upload: pick or drop a photo from a computer or phone and it
// is uploaded, placed and saved straight away by the parent's onFile.
export default function ImageUpload({
  onFile,
  label = "Upload dari PC / HP",
  hint = "JPG, PNG, WebP · langsung terpasang",
  multiple = false,
  compact = false,
}) {
  const input = useRef(null);
  const id = useId();
  const [state, setState] = useState("idle");
  const [over, setOver] = useState(false);
  async function handle(files) {
    const list = [...(files || [])].filter(Boolean);
    if (!list.length) return;
    setState("busy");
    try {
      for (const file of multiple ? list : list.slice(0, 1)) await onFile(file);
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <label
      htmlFor={id}
      className={
        "admin-upload-drop" +
        (compact ? " compact" : "") +
        (over ? " over" : "") +
        (state !== "idle" ? " " + state : "")
      }
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={state === "busy"}
        onChange={(e) => handle(e.target.files)}
      />
      <span className="admin-upload-icon">
        {state === "busy" ? (
          <i className="admin-spinner" aria-hidden="true" />
        ) : (
          <AdminIcon name={state === "done" ? "check" : "upload"} size={18} />
        )}
      </span>
      <span>
        <strong>
          {state === "busy"
            ? "Mengunggah…"
            : state === "done"
              ? "Terpasang"
              : label}
        </strong>
        {!compact && <small>{hint}</small>}
      </span>
    </label>
  );
}
