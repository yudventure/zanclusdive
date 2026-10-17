import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { saveAgent } from "../../../../src/server/store.js";
import {
  newAgent,
  syncAgent,
  syncAgents,
} from "../../../../src/server/agents.js";

export const dynamic = "force-dynamic";
// Agents, with calendars older than 30 minutes read again.
export async function GET(request) {
  const denied = await requireAdmin(request, "agents");
  if (denied) return denied;
  try {
    return Response.json(
      { agents: await syncAgents() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request) {
  const denied = await requireAdmin(request, "agents");
  if (denied) return denied;
  let agent;
  try {
    agent = newAgent(await jsonBody(request, 8000));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  try {
    return Response.json(await syncAgent(await saveAgent(agent)), {
      status: 201,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
