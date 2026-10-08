import {
  requireAdmin,
  jsonBody,
  apiFailure,
} from "../../../../src/server/auth.js";
import { saveBooking } from "../../../../src/server/store.js";
import { validateBooking } from "../../../../src/cms-model.js";
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  let payload;
  try {
    payload = validateBooking(await jsonBody(request));
  } catch (error) {
    return Response.json(
      { error: error.message || "Reservasi tidak valid." },
      { status: 400 },
    );
  }
  try {
    return Response.json(await saveBooking(payload), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
