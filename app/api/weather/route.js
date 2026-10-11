import { liveWeather } from "../../../src/server/weather.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { locations: await liveWeather() },
    // Browsers and proxies may reuse a reading for ten minutes.
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}
