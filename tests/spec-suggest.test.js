import test from "node:test";
import assert from "node:assert/strict";
import {
  joinValues,
  labelChoices,
  matching,
  presetSpecLabels,
  splitValues,
  valueChoices,
} from "../src/spec-suggest.js";

const catalog = [
  {
    specs: [
      { label: "Merek", value: "Poseidon" },
      { label: "Warna", value: "Merah, Hitam" },
    ],
  },
  {
    specs: [
      { label: "merek", value: "Scubapro" },
      { label: "Warna", value: "Hitam, Putih" },
      { label: "Berat", value: "1,5 kg" },
    ],
  },
  { specs: [{ label: "Merek", value: "Poseidon" }] },
];

test("row names come from the catalog first, then the presets", () => {
  const names = labelChoices(catalog);
  assert.deepEqual(names.slice(0, 3), ["Merek", "Warna", "Berat"]);
  // One spelling per name, and every preset not used yet after them.
  assert.equal(names.filter((n) => n.toLowerCase() === "merek").length, 1);
  assert.ok(presetSpecLabels.every((label) => names.includes(label)));
  assert.deepEqual(labelChoices([]), presetSpecLabels);
});

test("values come from the same row name in other products", () => {
  assert.deepEqual(valueChoices(catalog, "warna"), ["Hitam", "Merah", "Putih"]);
  assert.deepEqual(valueChoices(catalog, "Merek"), ["Poseidon", "Scubapro"]);
  assert.deepEqual(valueChoices(catalog, ""), []);
  assert.deepEqual(valueChoices(catalog, "Garansi"), []);
});

test("a row holds several values, split only at a comma and a space", () => {
  assert.deepEqual(splitValues("Merah, Hitam"), ["Merah", "Hitam"]);
  assert.deepEqual(splitValues("1,5 kg"), ["1,5 kg"]);
  assert.deepEqual(splitValues(""), []);
  assert.equal(joinValues(["Merah", "Putih"]), "Merah, Putih");
  // Search ignores case and accents.
  assert.deepEqual(matching(["Merah", "Hitam", "Kréme"], "kreme"), ["Kréme"]);
  assert.deepEqual(matching(["Merah", "Hitam"], ""), ["Merah", "Hitam"]);
});
