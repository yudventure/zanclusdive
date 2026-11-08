"use client";
import SearchSelect, { photoOptions } from "./SearchSelect.jsx";
import Thumb from "./Thumb.jsx";
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
      <Thumb src={value} alt={"Preview " + label} />
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
        <SearchSelect
          label={"Pilih foto " + label}
          adds
          placeholder="Cari di koleksi foto…"
          options={photoOptions(media, builtInPhotos)}
          onChange={(url) => url && onChange(url)}
        />
      </details>
    </div>
  );
}
