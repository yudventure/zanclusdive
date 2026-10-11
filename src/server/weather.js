import "server-only";
import { parseForecast, weatherLocations } from "../weather.js";

// MET Norway asks clients to identify themselves and to cache responses.
const userAgent = "ZanclusDiveWebsite/1.0 (+https://zanclusdive.com)";
const freshFor = 30 * 60 * 1000;
// After a failed request, wait before asking MET Norway again.
const retryAfter = 5 * 60 * 1000;
const staleFor = 6 * 60 * 60 * 1000;
const cache = (globalThis.__zanclusWeather ||= new Map());

async function fetchLocation({ key, lat, lon }) {
  const response = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
    {
      headers: { "User-Agent": userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("WEATHER_" + response.status);
  const current = parseForecast(await response.json());
  if (!current) throw new Error("WEATHER_FORMAT");
  return { key, ...current };
}

// Current weather for each location. On errors a reading up to six hours old
// is reused; otherwise the location is marked unavailable.
export async function liveWeather(now = Date.now()) {
  return Promise.all(
    weatherLocations.map(async (location) => {
      const cached = cache.get(location.key);
      const fallback =
        cached?.value && now - cached.at < staleFor
          ? cached.value
          : { key: location.key, unavailable: true };
      if (cached?.value && now - cached.at < freshFor) return cached.value;
      if (cached?.failedAt && now - cached.failedAt < retryAfter)
        return fallback;
      try {
        const value = await fetchLocation(location);
        cache.set(location.key, { at: now, value });
        return value;
      } catch (error) {
        console.error("Weather unavailable:", location.key, error.message);
        cache.set(location.key, { ...cached, failedAt: now });
        return fallback;
      }
    }),
  );
}
