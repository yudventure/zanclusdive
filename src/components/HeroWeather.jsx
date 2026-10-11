"use client";
import { useEffect, useState } from "react";
import { weatherLocations } from "../weather.js";
import { dictionary } from "../i18n.js";

const icons = {
  clear:
    "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4",
  night: "M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z",
  partly:
    "M8 4.5v1.5M3.5 9H5M4.8 5.8l1 1M12.2 5.8l-1 1M5.6 11.8a3.5 3.5 0 1 1 6.2-3.3M8.5 19.5h9a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2 3 3 0 0 0 .3 5.8Z",
  cloudy:
    "M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 18.5Z",
  fog: "M6.5 13.5a5.5 5.5 0 0 1 10.8-1.5 3.5 3.5 0 0 1 1.2 1.5M4 16.5h16M6 19.5h12",
  rain: "M7 14.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14.5ZM8 17.5l-1 2.5M12.5 17.5l-1 2.5M17 17.5l-1 2.5",
  showers:
    "M7 14.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14.5ZM9 17.5v1.5M13 18v2.5M17 17.5v1.5",
  storm:
    "M7 13.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 13.5ZM12.5 15l-2 3.5h3l-2 3.5",
};

function WeatherIcon({ name }) {
  return (
    <svg className="hero-stat-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={icons[name] || icons.cloudy}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Live conditions for Waisai, Dampier Strait and Sorong. Readings come from
// /api/weather, which caches MET Norway data on the server.
export default function HeroWeather({ locale }) {
  const w = dictionary(locale).weather;
  const [readings, setReadings] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/weather", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("WEATHER_UNAVAILABLE");
        const data = await response.json();
        setReadings(
          Object.fromEntries(data.locations.map((item) => [item.key, item])),
        );
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    load();
    const timer = setInterval(load, 15 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="hero-weather">
      <dl
        className="hero-stats"
        aria-label={w.label}
        aria-busy={!readings && !failed}
      >
        {weatherLocations.map(({ key }) => {
          const reading = readings?.[key];
          const ready = reading && !reading.unavailable;
          return (
            <div key={key}>
              <WeatherIcon name={ready ? reading.condition : "cloudy"} />
              <dt>
                {ready ? `${reading.temperature}°C` : "—"}
                <span className="sr-only"> {w.places[key]}</span>
              </dt>
              <dd>
                <span aria-hidden="true">{w.places[key]}</span>
                <small>
                  {ready
                    ? `${w.conditions[reading.condition]} · ${w.wind(reading.wind)}`
                    : readings || failed
                      ? w.unavailable
                      : w.loading}
                </small>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="hero-weather-source">
        <span className="tiny-dot" aria-hidden="true" />
        {w.live} ·{" "}
        <a
          href="https://www.met.no/en"
          target="_blank"
          rel="noopener noreferrer"
        >
          {w.source}
        </a>
      </p>
    </div>
  );
}
