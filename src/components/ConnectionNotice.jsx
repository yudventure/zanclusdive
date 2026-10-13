"use client";
import { useEffect, useState } from "react";

const text = {
  id: {
    offline:
      "Koneksi internet terputus. Halaman yang sudah terbuka tetap bisa dibaca.",
    online: "Koneksi kembali tersambung.",
  },
  en: {
    offline: "You're offline. Pages already open can still be read.",
    online: "You're back online.",
  },
};

// A small notice when the visitor's connection drops or comes back, and
// the service worker that shows the offline and server-error pages.
export default function ConnectionNotice({ locale = "en" }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production" &&
      !window.location.pathname.startsWith("/admin")
    )
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    let timer;
    const offline = () => {
      clearTimeout(timer);
      setState("offline");
    };
    const online = () => {
      setState("online");
      timer = setTimeout(() => setState(null), 3500);
    };
    if (navigator.onLine === false) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  const t = text[locale === "id" ? "id" : "en"];
  return (
    <div className="connection-notice" role="status" aria-live="polite">
      {state && (
        <p className={`connection-${state}`}>
          <span aria-hidden="true" />
          {t[state]}
        </p>
      )}
    </div>
  );
}
