import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultContent,
  validateContent,
  validateBooking,
  imageURL,
} from "../src/cms-model.js";
test("CMS content validates and rejects script URLs and malformed contact", () => {
  assert.equal(
    validateContent(structuredClone(defaultContent)).contact.whatsapp,
    defaultContent.contact.whatsapp,
  );
  assert.throws(() => imageURL("javascript:alert(1)"));
  assert.throws(() => imageURL("http://example.com/image.png"));
  const c = structuredClone(defaultContent);
  c.contact.whatsapp = "+62 851";
  assert.throws(() => validateContent(c));
});
test("at least one experience must remain active", () => {
  const c = structuredClone(defaultContent);
  for (const e of Object.values(c.experiences)) e.enabled = false;
  assert.throws(() => validateContent(c));
});
test("reservations enforce real dates, range, status, and numeric values", () => {
  const b = {
    experience: "beginner",
    status: "confirmed",
    source: "whatsapp",
    startDate: "2028-02-29",
    endDate: "2028-02-29",
    guestName: "Tamu",
    phone: "081234567890",
    participants: 2,
    amount: 1000000,
    notes: "",
  };
  assert.equal(validateBooking(b).participants, 2);
  assert.throws(() => validateBooking({ ...b, startDate: "2026-02-31" }));
  assert.throws(() => validateBooking({ ...b, endDate: "2028-02-28" }));
  assert.throws(() => validateBooking({ ...b, participants: 0 }));
  assert.throws(() => validateBooking({ ...b, status: "forged" }));
});
