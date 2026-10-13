"use client";
import { useState } from "react";
import { dictionary, formatIDR } from "../i18n.js";

// The last step of a form when online payment is on: the total, the button
// to the Midtrans payment page and, for guests who are still unsure, the
// same summary on WhatsApp. order is the body for /api/payments.
export default function PayPanel({
  order,
  total,
  breakdown,
  message,
  whatsapp,
  sandbox,
  locale,
  showTotal = true,
}) {
  const p = dictionary(locale).payment;
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setError("");
    setPaying(true);
    try {
      const response = await fetch(`/api/payments?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.redirectUrl)
        throw new Error(result.error || p.failed);
      window.location.assign(result.redirectUrl);
    } catch (err) {
      setError(err.message || p.failed);
      setPaying(false);
    }
  }
  return (
    <div className="pay-panel">
      {showTotal && (
        <p className="pay-total">
          <span>
            {p.total}
            {breakdown && <span className="plan-breakdown">{breakdown}</span>}
          </span>
          <strong>{formatIDR(total, locale)}</strong>
        </p>
      )}
      {error && (
        <p className="activity-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="button dark pay-submit"
        disabled={paying}
        onClick={pay}
      >
        {paying ? p.redirecting : p.submit(formatIDR(total, locale))}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      <div className="pay-notes">
        <p>{p.secure}</p>
        {sandbox && <p className="pay-sandbox">{p.sandbox}</p>}
      </div>
      {message && (
        <details className="plan-message">
          <summary>{p.viewMessage}</summary>
          <p className="activity-message-preview">{message}</p>
        </details>
      )}
      <a
        className="pay-unsure"
        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {p.askWhatsApp} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
