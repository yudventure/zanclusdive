import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultContent,
  validateContent,
  validateBooking,
  imageURL,
} from "../src/cms-model.js";
import { withContactFields, socialPlatforms } from "../src/contact-model.js";
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
test("social links require the matching HTTPS platform and old contact data remains editable", () => {
  const content = structuredClone(defaultContent);
  delete content.contact.facebook;
  delete content.contact.tiktok;
  delete content.contact.youtube;
  const migrated = withContactFields(content);
  assert.equal(migrated.contact.youtube, "");
  assert.equal(migrated.contact.email, content.contact.email);
  assert.equal(validateContent(content).contact.facebook, "");
  for (const [key, platform] of Object.entries(socialPlatforms)) {
    content.contact[key] = platform.url + "example";
    assert.equal(
      validateContent(content).contact[key],
      platform.url + "example",
    );
    for (const bad of [
      "javascript:alert(1)",
      "http://" + platform.hosts[0],
      "https://" + platform.hosts[0] + ".example/",
      "https://name:secret@" + platform.hosts[0] + "/",
    ]) {
      content.contact[key] = bad;
      assert.throws(() => validateContent(content));
    }
    content.contact[key] = "";
  }
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
