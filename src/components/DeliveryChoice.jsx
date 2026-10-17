"use client";
import FormField from "./FormField.jsx";
import { dictionary, formatIDR } from "../i18n.js";

// How a Dive Shop order reaches the guest: picked up at the dive center,
// or delivered to an address in one of the zones set in the admin, with
// the zone's fee. value is { method, zone, address }.
export const firstDelivery = (delivery) => ({
  method: delivery?.pickup === false ? "delivery" : "pickup",
  zone: "",
  address: "",
});
// The fee of what the guest picked so far, for the totals.
export const deliveryFee = (delivery, value) =>
  value?.method === "delivery"
    ? (delivery?.zones.find((z) => z.id === value.zone)?.fee ?? 0)
    : 0;

export default function DeliveryChoice({
  delivery,
  value,
  onChange,
  locale,
  id,
}) {
  if (!delivery) return null;
  const t = dictionary(locale).shop.delivery;
  const money = (n) => formatIDR(n, locale);
  const zones = delivery.enabled ? delivery.zones : [];
  const options = [
    delivery.pickup && {
      method: "pickup",
      title: t.pickup,
      note: delivery.pickupNote?.[locale] || "",
    },
    zones.length > 0 && {
      method: "delivery",
      title: t.deliver,
      note: delivery.note?.[locale] || "",
    },
  ].filter(Boolean);
  const set = (patch) => onChange({ ...value, ...patch });
  const cheapest = zones.length ? Math.min(...zones.map((z) => z.fee)) : 0;
  return (
    <fieldset className="delivery-choice">
      <legend>{t.title}</legend>
      <div className="delivery-options">
        {options.map((option) => (
          <label
            key={option.method}
            className={value.method === option.method ? "is-chosen" : ""}
          >
            <input
              type="radio"
              name={`${id}-delivery`}
              value={option.method}
              checked={value.method === option.method}
              onChange={() => set({ method: option.method })}
            />
            <span>
              <strong>{option.title}</strong>
              <small>
                {option.method === "delivery"
                  ? cheapest
                    ? t.from(money(cheapest))
                    : t.freeFrom
                  : option.note}
              </small>
            </span>
          </label>
        ))}
      </div>
      {value.method === "delivery" && zones.length > 0 && (
        <>
          <FormField id={`${id}-zone`} label={t.zone} icon="flag" required>
            <select
              id={`${id}-zone`}
              required
              value={value.zone}
              onChange={(e) => set({ zone: e.target.value })}
            >
              <option value="">{t.pickZone}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} · {zone.fee ? money(zone.fee) : t.free}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id={`${id}-address`}
            label={t.address}
            icon="home"
            required
          >
            <textarea
              id={`${id}-address`}
              rows={2}
              maxLength={300}
              required
              placeholder={t.addressPlaceholder}
              value={value.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </FormField>
          {delivery.note?.[locale] && (
            <p className="delivery-note">{delivery.note[locale]}</p>
          )}
        </>
      )}
    </fieldset>
  );
}
