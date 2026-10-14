import test from "node:test";
import assert from "node:assert/strict";
import {
  roles,
  roleKeys,
  areas,
  areasOf,
  hasArea,
  sections,
  sectionKeys,
  sectionAllowed,
  visibleMenu,
  groupOf,
  mergeByRole,
} from "../src/roles.js";
import { validateUser, publicUser } from "../src/users-model.js";

test("every role's areas exist and the superadmin has all of them", () => {
  for (const key of roleKeys)
    for (const area of roles[key].areas) assert.ok(area in areas, area);
  assert.deepEqual(areasOf("superadmin"), Object.keys(areas));
  assert.deepEqual(areasOf("nobody"), []);
});

test("sections belong to a known area; the shared ones are open to all", () => {
  for (const key of sectionKeys) {
    const area = sections[key].area;
    assert.ok(area === null || area in areas, key);
  }
  for (const role of roleKeys) {
    assert.ok(sectionAllowed(role, "overview"));
    assert.ok(sectionAllowed(role, "security"));
  }
  assert.ok(sectionAllowed("superadmin", "users"));
  assert.ok(!sectionAllowed("pr", "users"));
  assert.ok(!sectionAllowed("hrd", "reservations"));
  assert.ok(sectionAllowed("hrd", "payroll"));
  assert.ok(!sectionAllowed("gudang", "payroll"));
  assert.ok(sectionAllowed("gudang", "movements"));
  assert.ok(sectionAllowed("finance", "reports"));
  assert.ok(!sectionAllowed("finance", "stock"));
  assert.ok(sectionAllowed("pr", "reservations"));
  assert.ok(sectionAllowed("finance", "payments"));
  assert.ok(!sectionAllowed("pr", "payments"));
  assert.ok(!sectionAllowed("pr", "missing"));
  assert.ok(hasArea("gudang", null));
});

test("the menu shows each role its own groups only", () => {
  const keys = (role) => visibleMenu(role).map((group) => group.key);
  assert.deepEqual(keys("superadmin"), [
    "desk",
    "website",
    "pr",
    "hrd",
    "finance",
    "gudang",
    "system",
    "users",
  ]);
  assert.deepEqual(keys("hrd"), ["desk", "hrd", "system"]);
  assert.deepEqual(keys("finance"), ["desk", "finance", "system"]);
  const finance = visibleMenu("finance");
  assert.deepEqual(finance[0].items, ["overview"]);
  assert.deepEqual(finance[1].items, ["payments", "cashbook", "reports"]);
  assert.deepEqual(finance[2].items, ["security"]);
  const pr = visibleMenu("pr");
  assert.deepEqual(pr[0].items, [
    "overview",
    "calendar",
    "reservations",
    "customers",
  ]);
  assert.equal(pr[1].key, "website");
  assert.equal(pr[1].items.length, 11);
  assert.deepEqual(pr[2].items, ["social", "agents"]);
  assert.deepEqual(pr[3].items, ["security"]);
  // Every section is reachable from the superadmin's menu, once.
  const listed = visibleMenu("superadmin").flatMap((group) => group.items);
  assert.deepEqual([...listed].sort(), [...sectionKeys].sort());
  assert.equal(groupOf("contact"), "website");
  assert.equal(groupOf("users"), "users");
  assert.equal(groupOf("missing"), null);
  // Every page has an intro except the overview, which has its own hero.
  for (const key of sectionKeys)
    assert.equal(typeof sections[key].intro, "string", key);
});

test("saving content keeps the groups a role may not change", () => {
  const current = {
    text: { title: "Lama" },
    developer: { enabled: true },
    payments: { enabled: false },
  };
  const next = {
    text: { title: "Baru" },
    developer: { enabled: false },
    payments: { enabled: true },
  };
  assert.deepEqual(mergeByRole("pr", next, current), {
    text: { title: "Baru" },
    developer: { enabled: true },
    payments: { enabled: false },
  });
  assert.deepEqual(mergeByRole("finance", next, current), {
    text: { title: "Lama" },
    developer: { enabled: true },
    payments: { enabled: true },
  });
  assert.deepEqual(mergeByRole("superadmin", next, current), next);
  // A new group from an allowed editor is kept; one from a kept area is not
  // invented.
  assert.deepEqual(
    mergeByRole("pr", { ...next, gallery: [1] }, current).gallery,
    [1],
  );
  assert.equal("developer" in mergeByRole("pr", next, { text: {} }), false);
});

test("a user needs a real email, a known role and a tidy name", () => {
  const user = validateUser({
    email: "  Siti.HRD@Zanclus.ID ",
    role: "hrd",
    name: "  Siti   Rahma ",
  });
  assert.deepEqual(user, {
    email: "siti.hrd@zanclus.id",
    name: "Siti Rahma",
    role: "hrd",
    active: true,
  });
  // A name is made from the email when none is given.
  assert.equal(
    validateUser({ email: "budi.gudang@zanclus.id", role: "gudang" }).name,
    "Budi gudang",
  );
  assert.throws(() => validateUser({ email: "bukan-email", role: "hrd" }), {
    message: /email/,
  });
  assert.throws(() => validateUser({ email: "a@b.co", role: "boss" }), {
    message: /peran/,
  });
  assert.throws(
    () => validateUser({ email: "a@b.co", role: "pr", name: "<b>x</b>" }),
    { message: /< atau >/ },
  );
  assert.throws(
    () => validateUser({ email: "a@b.co", role: "pr", name: "x".repeat(61) }),
    { message: /60/ },
  );
  assert.throws(() => validateUser(null), { message: /tidak valid/ });
});

test("editing keeps the email and fills what is not sent", () => {
  const current = {
    id: "user:1",
    email: "siti@zanclus.id",
    name: "Siti",
    role: "hrd",
    active: true,
  };
  assert.deepEqual(validateUser({ role: "finance" }, current), {
    email: "siti@zanclus.id",
    name: "Siti",
    role: "finance",
    active: true,
  });
  assert.deepEqual(
    validateUser({ email: "other@zanclus.id", active: false }, current),
    { email: "siti@zanclus.id", name: "Siti", role: "hrd", active: false },
  );
  const shown = publicUser({ ...current, createdAt: "2026-10-14T00:00:00Z" });
  assert.equal(shown.roleLabel, "HRD");
  assert.equal(shown.active, true);
  assert.ok(!("password" in shown) && !("hash" in shown));
});
