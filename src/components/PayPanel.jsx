"use client";
import { useState } from "react";
import { dictionary, formatIDR } from "../i18n.js";
import {
  usePayMethod,
  payButtonText,
  PayMethodChoice,
  PayNotes,
} from "./PayMethods.jsx";

// The last step of a form when payment is on: the total, the ways to pay
// (Midtrans, bank transfer, PayPal), the button and, for guests who are
// still unsure, the same summary on WhatsApp. order is the body for
// /api/payments. payments comes from paymentOptions() on the server.
export default function PayPanel({
  order,
  total,
  breakdown,
  message,
  whatsapp,
  payments,
  locale,
  showTotal = true,
  submitText,
  unsureText,
}) {
  const p = dictionary(locale).payment;
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod, methods] = usePayMethod(payments);
  async function pay() {
    setError("");
    setPaying(true);
    try {
      const response = await fetch(`/api/payments?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, method }),
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
      <PayMethodChoice
        p={p}
        methods={methods}
        method={method}
        onChange={setMethod}
        disabled={paying}
      />
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
        {(!paying && method === "midtrans" && submitText) ||
          payButtonText(p, method, { total, locale, payments, paying })}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      <PayNotes p={p} method={method} payments={payments} total={total} />
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
        {unsureText || p.askWhatsApp} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
