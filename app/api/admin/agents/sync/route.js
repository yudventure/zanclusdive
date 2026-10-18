import { requireAdmin, apiFailure } from "../../../../../src/server/auth.js";
import { syncAgents } from "../../../../../src/server/agents.js";

export const dynamic = "force-dynamic";
// Reads every travel agent and OTA calendar now, for the button on the
// reservation calendar. The answer counts what was read and names the
// calendars that could not be read.
export async function POST(request) {
  const denied = await requireAdmin(request, "bookings");
  if (denied) return denied;
  try {
    const linked = (await syncAgents({ force: true })).filter(
      (agent) => agent.enabled && agent.importUrl,
    );
    return Response.json({
      read: linked.filter((agent) => !agent.syncError).length,
      events: linked.reduce(
        (sum, agent) => sum + (agent.events?.length ?? 0),
        0,
      ),
      failed: linked
        .filter((agent) => agent.syncError)
        .map((agent) => ({ name: agent.name, error: agent.syncError })),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
