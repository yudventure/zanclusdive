"use client";
import { useState } from "react";
import { dictionary, formatIDR, localeHref } from "../i18n.js";
import { paypalAmount } from "../payment-model.js";
import { legalLabels, legalPaths } from "../legal-model.js";

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

// Booking means agreeing to the terms and the reschedule and refund
// policy; both open in a new tab so the checkout stays as it is.
function PayAgree({ locale }) {
  const l = dictionary(locale).legal;
  const link = (key) => (
    <a
      href={localeHref(locale, legalPaths[key])}
      target="_blank"
      rel="noopener noreferrer"
    >
      {legalLabels[key][locale] || legalLabels[key].id}
    </a>
  );
  return (
    <p className="pay-agree">
      {l.agree} {link("terms")} {l.and} {link("refund")}.
    </p>
  );
}

// The small print under the button, for the way picked. Without a choice
// to make, the way to pay is explained here.
export function PayNotes({ p, method, payments, total, locale = "en" }) {
  if (method === "transfer")
    return (
      <div className="pay-notes">
        {(payments?.methods?.length ?? 0) < 2 && <p>{p.methods.transfer[1]}</p>}
        <p>{p.transferHold}</p>
        <PayAgree locale={locale} />
      </div>
    );
  if (method === "paypal")
    return (
      <div className="pay-notes">
        <p>{p.paypalAmount(paypalUsd(payments, total))}</p>
        {payments?.paypalSandbox && (
          <p className="pay-sandbox">{p.paypalSandbox}</p>
        )}
        <PayAgree locale={locale} />
      </div>
    );
  return (
    <div className="pay-notes">
      <p>{p.secure}</p>
      {payments?.sandbox && <p className="pay-sandbox">{p.sandbox}</p>}
      <PayAgree locale={locale} />
    </div>
  );
}
