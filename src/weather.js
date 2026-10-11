// Live weather in the hero, from MET Norway Locationforecast (api.met.no).
// Coordinates use at most 4 decimals, as the API terms require.
export const weatherLocations = [
  { key: "waisai", lat: -0.4214, lon: 130.8144 },
  // Dampier Strait near Kri, the main dive area between Waigeo and Batanta.
  { key: "dampier", lat: -0.56, lon: 130.68 },
  { key: "sorong", lat: -0.8762, lon: 131.2558 },
];

// MET symbol codes ("lightrainshowers_day") grouped into the icons we show.
export function weatherCondition(symbol = "") {
  const code = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (code.includes("thunder")) return "storm";
  if (/rain|sleet|snow/.test(code))
    return code.includes("showers") ? "showers" : "rain";
  if (code === "fog") return "fog";
  if (code === "cloudy") return "cloudy";
  if (code === "partlycloudy" || code === "fair") return "partly";
  if (code === "clearsky") return symbol.endsWith("_night") ? "night" : "clear";
  return "cloudy";
}

// Current conditions from a Locationforecast "compact" response.
export function parseForecast(json) {
  const now = json?.properties?.timeseries?.[0];
  const details = now?.data?.instant?.details;
  if (!details || typeof details.air_temperature !== "number") return null;
  const symbol =
    now.data.next_1_hours?.summary?.symbol_code ||
    now.data.next_6_hours?.summary?.symbol_code ||
    "";
  return {
    temperature: Math.round(details.air_temperature),
    // m/s to km/h
    wind: Math.round((details.wind_speed ?? 0) * 3.6),
    condition: weatherCondition(symbol),
    time: now.time,
  };
}
