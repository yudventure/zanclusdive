import "server-only";
import { randomBytes } from "node:crypto";
import { requireAdmin, currentAdmin, jsonBody, apiFailure } from "./auth.js";
import { listRecords, saveRecord, deleteRecord } from "./store.js";

// Shared pieces for the module APIs (finance, inventory, content plan):
// ids, the month in WIT, and create / update / delete handlers for one
// record kind. "validate(input, current, context)" returns the clean
// record or throws a message for the person.
export const headers = { "Cache-Control": "no-store" };
export const bad = (message, status = 400) =>
  Response.json({ error: message }, { status });
export const newId = (prefix) => `${prefix}:${randomBytes(6).toString("hex")}`;
export const validId = (prefix, id) =>
  typeof id === "string" && new RegExp(`^${prefix}:[0-9a-f]{12}$`).test(id);
export const currentMonth = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Jayapura" })
    .slice(0, 7);
export const monthParam = (request) =>
  new URL(request.url).searchParams.get("month") || currentMonth();

export function createHandler({
  area,
  kind,
  prefix,
  validate,
  limit = 20000,
  context = async () => ({}),
}) {
  return async function POST(request) {
    const denied = await requireAdmin(request, area);
    if (denied) return denied;
    let data;
    try {
      data = await jsonBody(request, 20000);
    } catch {
      return bad("Data tidak valid.");
    }
    try {
      const ctx = await context();
      let record;
      try {
        record = validate(data, null, ctx);
      } catch (error) {
        return bad(error.message);
      }
      if ((await listRecords(kind)).length >= limit)
        return bad(`Maksimal ${limit} data.`);
      const admin = await currentAdmin();
      const now = new Date().toISOString();
      const saved = {
        id: newId(prefix),
        ...record,
        createdAt: now,
        updatedAt: now,
        createdBy: admin.email,
      };
      await saveRecord(kind, saved);
      return Response.json(saved, { status: 201, headers });
    } catch (error) {
      return apiFailure(error);
    }
  };
}

export function itemHandlers({
  area,
  kind,
  prefix,
  validate,
  context = async () => ({}),
  label = "Data",
}) {
  const notFound = () => bad(`${label} tidak ditemukan.`, 404);
  return {
    async PUT(request, { params }) {
      const denied = await requireAdmin(request, area);
      if (denied) return denied;
      const { id } = await params;
      if (!validId(prefix, id)) return notFound();
      let data;
      try {
        data = await jsonBody(request, 20000);
      } catch {
        return bad("Data tidak valid.");
      }
      try {
        const current = (await listRecords(kind)).find((r) => r.id === id);
        if (!current) return notFound();
        let changes;
        try {
          changes = validate(data, current, await context());
        } catch (error) {
          return bad(error.message);
        }
        const saved = {
          ...current,
          ...changes,
          updatedAt: new Date().toISOString(),
        };
        await saveRecord(kind, saved);
        return Response.json(saved, { headers });
      } catch (error) {
        return apiFailure(error);
      }
    },
    async DELETE(request, { params }) {
      const denied = await requireAdmin(request, area);
      if (denied) return denied;
      const { id } = await params;
      if (!validId(prefix, id)) return notFound();
      try {
        return (await deleteRecord(kind, id))
          ? Response.json({ ok: true }, { headers })
          : notFound();
      } catch (error) {
        return apiFailure(error);
      }
    },
  };
}
