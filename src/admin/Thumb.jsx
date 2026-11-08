"use client";
import { isMediaPath, photoSrcSet } from "../photography.js";

// A photo preview in the admin. An upload comes as its small WebP copy
// (480 or 828 px wide) and the site's own photos as their small file,
// each loaded only when it scrolls into view, so a page full of previews
// opens fast instead of downloading every photo at full size.
export default function Thumb({
  src,
  alt,
  sizes = "(max-width: 700px) 90vw, 400px",
  ...rest
}) {
  if (!src) return null;
  return (
    <img
      src={isMediaPath(src) ? `${src}?w=480` : src}
      srcSet={photoSrcSet(src)}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
}
