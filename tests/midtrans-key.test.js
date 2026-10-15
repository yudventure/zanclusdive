import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanKey,
  keyEnding,
  keyIssues,
  productionOn,
} from "../src/midtrans-key.js";

// Made-up keys, put together here so secret scanning does not take them
// for real ones.
const live = ["Mid", "server", "AbCdEfGhIjKlMnOpQrStUvWx"].join("-");
const sandbox = ["SB", "Mid", "server", "AbCdEfGhIjKl_MnOp-QrSt"].join("-");

test("a clean key in the right mode has no issues", () => {
  assert.deepEqual(keyIssues(live, "true"), []);
  assert.deepEqual(keyIssues(sandbox, ""), []);
  assert.deepEqual(keyIssues(sandbox, undefined), []);
  assert.deepEqual(keyIssues("VT-server-AbCdEfGh", "false"), []);
  assert.deepEqual(keyIssues("", ""), []);
  // Quotes and spaces around the values are ignored.
  assert.equal(cleanKey(`  "${live}" `), live);
  assert.deepEqual(keyIssues(` '${live}'`, ' "True" '), []);
  assert.equal(productionOn("TRUE"), true);
  assert.equal(productionOn("1"), false);
  assert.equal(productionOn(undefined), false);
});

test("text pasted after the key is named, with the production variable", () => {
  // What the owner's hPanel held: the flag typed into the key's value.
  const issues = keyIssues(live + "=true)", undefined);
  assert.equal(issues.length, 2);
  assert.match(issues[0], /teks tambahan "=true\)"/);
  assert.match(
    issues[0],
    /MIDTRANS_PRODUCTION dibuat sebagai variabel sendiri/,
  );
  assert.match(
    issues[1],
    /tambahkan variabel baru bernama MIDTRANS_PRODUCTION/,
  );
  // With the flag set, the extra text is still the problem.
  assert.deepEqual(
    keyIssues(`${live} MIDTRANS_PRODUCTION=true`, "true").length,
    1,
  );
  const before = keyIssues(`Server Key ${sandbox}`, "");
  assert.equal(before.length, 1);
  assert.match(before[0], /"Server Key"/);
  assert.doesNotMatch(before[0], /MIDTRANS_PRODUCTION dibuat/);
  // The key itself is never repeated in a message.
  for (const issue of [...issues, ...before])
    assert.doesNotMatch(issue, /AbCdEf/);
});

test("wrong keys and a wrong flag are explained", () => {
  assert.match(keyIssues("Mid-client-abc", "true")[0], /Client Key/);
  assert.match(keyIssues("SB-Mid-client-abc", "")[0], /Client Key/);
  assert.match(keyIssues("abc123", "")[0], /bukan Server Key Midtrans/);
  assert.match(keyIssues(live, "")[0], /MIDTRANS_PRODUCTION belum true/);
  assert.match(keyIssues(sandbox, "true")[0], /Server key sandbox/);
  const flag = keyIssues(live, "true)");
  assert.match(flag[0], /MIDTRANS_PRODUCTION berisi "true\)"/);
  assert.match(flag[1], /belum true/);
});

test("the admin sees only the last four characters of a key", () => {
  assert.equal(keyEnding(live), "UvWx");
  assert.equal(keyEnding(live + "=true)"), "rue)");
  assert.equal(keyEnding("short"), "");
  assert.equal(keyEnding(undefined), "");
});

test("no message uses a colon, semicolon or long dash", () => {
  const all = [
    ...keyIssues(live + "=true)", "ya"),
    ...keyIssues("Mid-client-x", ""),
    ...keyIssues("abc", ""),
    ...keyIssues(sandbox, "true"),
  ];
  for (const message of all) assert.doesNotMatch(message, /[;—]|:(?!\/\/)/);
});
