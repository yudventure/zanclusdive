"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bookingAlerts } from "../booking-alerts.js";
import { AdminIcon } from "./icons.jsx";

// The admin looks for new reservations every 45 seconds, also while its
// tab is in the background, and at once when the tab is shown again.
const every = 45000;
const soundKey = "zanclus-admin-sound";

// The chime is set per device: on unless switched off on this browser.
export function soundEnabled() {
  try {
    return localStorage.getItem(soundKey) !== "off";
  } catch {
    return true;
  }
}
function keepSound(on) {
  try {
    localStorage.setItem(soundKey, on ? "on" : "off");
  } catch {}
}

// One sound engine for the page. Browsers only play sound after a tap or
// a key on the page, so the first one starts it.
let engine = null;
function audio() {
  const Engine =
    typeof window !== "undefined" &&
    (window.AudioContext || window.webkitAudioContext);
  if (!Engine) return null;
  if (!engine) engine = new Engine();
  if (engine.state === "suspended") engine.resume().catch(() => {});
  return engine;
}

// Two rising notes, twice, loud enough to hear across the office.
export function chime() {
  window.dispatchEvent(new Event("zanclus-chime"));
  const sound = audio();
  if (!sound) return;
  const start = sound.currentTime + 0.05;
  [
    [880, 0],
    [1318.5, 0.18],
    [880, 0.62],
    [1318.5, 0.8],
  ].forEach(([pitch, at]) => {
    const tone = sound.createOscillator();
    const volume = sound.createGain();
    tone.type = "sine";
    tone.frequency.value = pitch;
    volume.gain.setValueAtTime(0.0001, start + at);
    volume.gain.exponentialRampToValueAtTime(0.4, start + at + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.5);
    tone.connect(volume).connect(sound.destination);
    tone.start(start + at);
    tone.stop(start + at + 0.55);
  });
}

// Watches the reservations: rings, lists what came in and puts the count
// in the tab's title. bookings is the list the admin already has; the
// fresh list goes to setBookings. markSeen keeps the admin's own saves
// from ringing.
export function useBookingAlerts({ active, bookings, setBookings }) {
  const seen = useRef(null);
  const last = useRef("");
  const [alerts, setAlerts] = useState([]);
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(soundEnabled()), []);
  useEffect(() => {
    if (!active) return;
    const start = () => audio();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [active]);
  useEffect(() => {
    if (!active || !bookings) return;
    last.current = JSON.stringify(bookings);
    const result = bookingAlerts(seen.current ?? new Map(), bookings);
    const first = !seen.current;
    seen.current = result.seen;
    if (first || !result.alerts.length) return;
    setAlerts((current) => [...result.alerts, ...current].slice(0, 20));
    if (soundEnabled()) chime();
  }, [active, bookings]);
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    async function look() {
      try {
        const response = await fetch("/api/admin/bookings", {
          cache: "no-store",
        });
        if (!response.ok || stopped) return;
        const result = await response.json();
        if (stopped || !Array.isArray(result.bookings)) return;
        if (JSON.stringify(result.bookings) !== last.current)
          setBookings(result.bookings);
      } catch {}
    }
    const timer = setInterval(look, every);
    const shown = () => {
      if (document.visibilityState === "visible") look();
    };
    document.addEventListener("visibilitychange", shown);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", shown);
    };
  }, [active]);
  useEffect(() => {
    const plain = document.title.replace(/^\(\d+\) /, "");
    document.title = alerts.length ? `(${alerts.length}) ${plain}` : plain;
  }, [alerts.length]);
  return {
    alerts,
    dismiss: () => setAlerts([]),
    drop: (booking) =>
      setAlerts((current) =>
        current.filter((a) => a.booking.id !== booking.id),
      ),
    markSeen(booking) {
      if (booking?.id && seen.current)
        seen.current.set(booking.id, booking.payment?.status === "paid");
    },
    sound,
    setSound(on) {
      keepSound(on);
      setSound(on);
      if (on) chime();
    },
  };
}

const kinds = { new: "Booking baru", paid: "Pembayaran masuk" };

// The note in the corner that stays until it is closed.
export function BookingAlertToast({ alerts, onOpen, onClose, label }) {
  if (!alerts.length) return null;
  return (
    <section
      className="admin-alert-toast"
      role="alert"
      aria-labelledby="booking-alert-title"
    >
      <div className="admin-alert-head">
        <AdminIcon name="bell" size={18} />
        <h2 id="booking-alert-title">
          {alerts.length === 1
            ? kinds[alerts[0].kind] + " masuk dari website"
            : `${alerts.length} kabar baru dari website`}
        </h2>
        <button
          type="button"
          className="admin-alert-close"
          aria-label="Tutup pemberitahuan"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <ul>
        {alerts.slice(0, 4).map(({ kind, booking }) => (
          <li key={kind + booking.id}>
            <span className={"admin-alert-kind " + kind}>{kinds[kind]}</span>
            <Link
              href={"/admin/calendar?booking=" + booking.id}
              onClick={(event) => onOpen(event, booking)}
            >
              {label(booking)}
            </Link>
          </li>
        ))}
      </ul>
      {alerts.length > 4 && (
        <p className="admin-subtle">
          Dan {alerts.length - 4} lainnya di Kalender reservasi.
        </p>
      )}
    </section>
  );
}

// The switch in the bell's menu, with a button to hear the chime.
export function AlertSoundSetting({ sound, setSound }) {
  return (
    <div className="admin-alert-sound">
      <label>
        <input
          type="checkbox"
          checked={sound}
          onChange={(event) => setSound(event.target.checked)}
        />
        Bunyi saat booking masuk
      </label>
      <button type="button" className="admin-inline" onClick={() => chime()}>
        Tes bunyi
      </button>
      <small>
        Berlaku di perangkat ini. Biarkan panel terbuka, juga di tab lain,
        supaya bunyinya terdengar.
      </small>
    </div>
  );
}
