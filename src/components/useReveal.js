import { useEffect, useRef } from "react";

// Brings a block into view when it appears, e.g. the prepared WhatsApp
// message at the end of a form panel that scrolls on its own.
export function useReveal(value) {
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({
      block: "nearest",
      behavior: calm ? "auto" : "smooth",
    });
  }, [value]);
  return ref;
}
