"use client";
import { useId } from "react";
import ImageUpload from "./ImageUpload.jsx";
import { builtInPhotos } from "../photography.js";

// A page photo in the admin: one tap uploads and places it; another photo
// from the collection or a pasted address stays one click away.
export default function PhotoField({
  label,
  value,
  media,
  onChange,
  placePhoto,
  guide = "",
}) {
  const id = useId();
  return (
    <div className="admin-image-slot wide">
      {value && <img src={value} alt={"Preview " + label} />}
      <strong>{label}</strong>
      <ImageUpload
        guide={guide}
        label={value ? "Ganti foto" : "Upload foto"}
        onFile={(file) => placePhoto(file, onChange)}
      />
      <details className="admin-more">
        <summary>Pilih foto lain atau tempel URL</summary>
        <div className="admin-field">
          <label htmlFor={id}>{"URL foto " + label}</label>
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <select
          aria-label={"Pilih foto " + label}
          value=""
          onChange={(e) => e.target.value && onChange(e.target.value)}
        >
          <option value="">Pilih dari koleksi…</option>
          {media.length > 0 && (
            <optgroup label="Foto yang diunggah">
              {media.map((m) => (
                <option value={m.url} key={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Foto bawaan website">
            {builtInPhotos.map(([url, title]) => (
              <option value={url} key={url}>
                {title}
              </option>
            ))}
          </optgroup>
        </select>
      </details>
    </div>
  );
}
