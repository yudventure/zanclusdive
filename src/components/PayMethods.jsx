"use client";
import { useState } from "react";
import { formatIDR } from "../i18n.js";
import { paypalAmount } from "../payment-model.js";

// The ways to pay the checkout offers (Midtrans, bank transfer, PayPal) and
// the texts that change with the one picked. With one way only, nothing is
// asked. payments comes from paymentOptions() on the server.
export function usePayMethod(payments) {
  const methods = payments?.methods?.length ? payments.methods : ["midtrans"];
  const [picked, setPicked] = useState(methods[0]);
  return [methods.includes(picked) ? picked : methods[0], setPicked, methods];
}

export const paypalUsd = (payments, total) =>
  paypalAmount(Number(total) || 0, payments?.paypalRate || 16000);

export function payButtonText(p, method, { total, locale, payments, paying }) {
  if (method === "transfer")
    return paying ? p.savingTransfer : p.submitTransfer;
  if (method === "paypal")
    return paying
      ? p.openingPaypal
      : p.submitPaypal(paypalUsd(payments, total));
  return paying ? p.redirecting : p.submit(formatIDR(total, locale));
}

export function PayMethodChoice({ p, methods, method, onChange, disabled }) {
  if (methods.length < 2) return null;
  return (
    <fieldset className="plan-fares pay-methods">
      <legend>{p.methodTitle}</legend>
      <div className="plan-fare-list">
        {methods.map((key) => {
          const [name, note] = p.methods[key];
          return (
            <label
              key={key}
              className={"plan-fare" + (key === method ? " is-chosen" : "")}
            >
              <input
                type="radio"
                name="pay-method"
                value={key}
                checked={key === method}
                disabled={disabled}
                onChange={() => onChange(key)}
              />
              <span className="plan-fare-head">
                <strong>{name}</strong>
              </span>
              <small>{note}</small>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// The small print under the button, for the way picked. Without a choice
// to make, the way to pay is explained here.
export function PayNotes({ p, method, payments, total }) {
  if (method === "transfer")
    return (
      <div className="pay-notes">
        {(payments?.methods?.length ?? 0) < 2 && <p>{p.methods.transfer[1]}</p>}
        <p>{p.transferHold}</p>
      </div>
    );
  if (method === "paypal")
    return (
      <div className="pay-notes">
        <p>{p.paypalAmount(paypalUsd(payments, total))}</p>
        {payments?.paypalSandbox && (
          <p className="pay-sandbox">{p.paypalSandbox}</p>
        )}
      </div>
    );
  return (
    <div className="pay-notes">
      <p>{p.secure}</p>
      {payments?.sandbox && <p className="pay-sandbox">{p.sandbox}</p>}
    </div>
  );
}
