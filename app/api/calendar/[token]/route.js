import {
  getContent,
  listBookings,
  listAgents,
} from "../../../../src/server/store.js";
import { agentByToken, syncAgents } from "../../../../src/server/agents.js";
import { agentFeed } from "../../../../src/agent-calendar.js";

// A travel agent's private calendar feed (.ics), for Google Calendar,
// Apple Calendar or Outlook. The token in the address is the key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  const { token } = await params;
  const agent = await agentByToken(token.replace(/\.ics$/, ""));
  if (!agent) return new Response("Not found", { status: 404 });
  // Shared agent calendars are refreshed in the background.
  syncAgents().catch(() => {});
  const [{ content }, bookings, agents] = await Promise.all([
    getContent(),
    listBookings(),
    listAgents(),
  ]);
  return new Response(agentFeed({ content, bookings, agents, agent }), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="zanclus.ics"',
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
