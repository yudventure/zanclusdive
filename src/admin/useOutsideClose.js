"use client";
import { useEffect, useRef } from "react";

// A popover that closes on a tap or click anywhere outside it, or on
// Escape. The listener sits on the document for pointerdown, which reaches
// it on an iPhone too, where a click on an element without a handler of its
// own never arrives. The ref goes on the element that holds both the
// button and the popover, so the button still toggles it.
export function useOutsideClose(open, close) {
  const ref = useRef(null);
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!open) return;
    const away = (event) => {
      if (!ref.current?.contains(event.target)) latest.current();
    };
    const key = (event) => {
      if (event.key === "Escape") latest.current();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return ref;
}
