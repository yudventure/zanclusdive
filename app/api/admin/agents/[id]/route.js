import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../../src/server/auth.js";
import {
  listAgents,
  updateAgent,
  deleteAgent,
} from "../../../../../src/server/store.js";
import {
  validateAgent,
  newToken,
  syncAgent,
} from "../../../../../src/server/agents.js";

export const dynamic = "force-dynamic";
// Edit an agent; { action: "token" } makes a new feed link (the old one
// stops working) and { action: "sync" } reads their calendar now.
export async function PUT(request, { params }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  try {
    const current = (await listAgents()).find((a) => a.id === id);
    if (!current)
      return Response.json({ error: "Agen tidak ditemukan." }, { status: 404 });
    let input;
    try {
      input = await jsonBody(request, 8000);
    } catch {
      return Response.json(
        { error: "Data agen tidak valid." },
        { status: 400 },
      );
    }
    if (input.action === "token")
      return Response.json(
        await updateAgent(id, (agent) => ({ ...agent, token: newToken() })),
      );
    if (input.action === "sync")
      return Response.json(await syncAgent(current, { force: true }));
    try {
      validateAgent(input, current);
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const agent = await updateAgent(id, (agent) => validateAgent(input, agent));
    return agent
      ? Response.json(await syncAgent(agent))
      : Response.json({ error: "Agen tidak ditemukan." }, { status: 404 });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(request, { params }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  try {
    return (await deleteAgent(id))
      ? Response.json({ ok: true })
      : Response.json({ error: "Agen tidak ditemukan." }, { status: 404 });
  } catch (error) {
    return apiFailure(error);
  }
}
