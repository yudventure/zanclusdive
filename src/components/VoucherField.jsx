"use client";
import { useEffect, useRef, useState } from "react";
import { dictionary, formatIDR } from "../i18n.js";
import { cleanCode } from "../voucher-model.js";

// A voucher code at a Dive Shop checkout. The server prices the discount
// on the cart (/api/vouchers), the same way it prices the payment, and the
// discount is checked again whenever the cart, the rental days or the
// fare change. "order" is { kind, lines, days, startDate, fare } and
// "value" the voucher applied, { code, discount }, or null.
export default function VoucherField({ id, order, value, onChange, locale }) {
  const t = dictionary(locale).shop.voucher;
  const [code, setCode] = useState(value?.code ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify(order);
  const checked = useRef(key);
  async function check(next) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/vouchers?locale=${locale === "en" ? "en" : "id"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...order, voucher: next }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t.failed);
      onChange({ code: result.code, discount: result.discount });
    } catch (e) {
      onChange(null);
      setError(e.message || t.failed);
    } finally {
      setBusy(false);
    }
  }
  // The cart changed: the voucher applied is priced again on it.
  useEffect(() => {
    if (key === checked.current) return;
    checked.current = key;
    if (value?.code) check(value.code);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const typed = cleanCode(code);
  return (
    <div className="voucher-field">
      {value ? (
        <p className="voucher-applied">
          <span>{t.applied(value.code)}</span>
          <strong>−{formatIDR(value.discount, locale)}</strong>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError("");
            }}
          >
            {t.remove}
          </button>
        </p>
      ) : (
        <>
          <label htmlFor={`${id}-voucher`}>{t.label}</label>
          <div className="voucher-row">
            <input
              id={`${id}-voucher`}
              value={code}
              maxLength={24}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder={t.placeholder}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                // Enter applies the code instead of sending the order.
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (typed.length >= 4 && !busy) check(typed);
              }}
            />
            <button
              type="button"
              disabled={busy || typed.length < 4}
              onClick={() => check(typed)}
            >
              {busy ? t.checking : t.apply}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="voucher-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
