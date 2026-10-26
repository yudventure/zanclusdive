"use client";
import { fareChoices, fareMarkup, fareSettings } from "../fare-model.js";
import { dictionary, formatIDR } from "../i18n.js";

// The fare picker at checkout: Standard, Comfort and Flexi with what each
// costs on top of the base and what it allows. Nothing is shown when fares
// are switched off (every order is then Standard).
export default function FareChoice({ fares, base, value, onChange, locale }) {
  const f = dictionary(locale).fare;
  const settings = fareSettings(fares);
  const choices = fareChoices(settings);
  if (choices.length < 2) return null;
  return (
    <fieldset className="plan-fares">
      <legend>{f.title}</legend>
      <p className="plan-fares-intro">{f.intro}</p>
      <div className="plan-fare-list">
        {choices.map(({ tier, percent }) => (
          <label
            key={tier}
            className={"plan-fare" + (value === tier ? " is-chosen" : "")}
          >
            <input
              type="radio"
              name="fare"
              value={tier}
              checked={value === tier}
              onChange={() => onChange(tier)}
            />
            <span className="plan-fare-head">
              <strong>{f.names[tier]}</strong>
              <em>
                {percent
                  ? f.extra(formatIDR(fareMarkup(base, percent), locale))
                  : f.base}
              </em>
            </span>
            <small>{f.rules[tier](settings)}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
