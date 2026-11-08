import test from "node:test";
import assert from "node:assert/strict";
import { issueOtp, checkOtp, dropOtp } from "../src/server/otp.js";

const minute = 60000;

test("an emailed code works once, within 10 minutes", () => {
  const now = Date.now();
  const code = issueOtp("Operator@Zanclus.test", now);
  assert.match(code, /^\d{6}$/);
  const wrong = code === "000000" ? "111111" : "000000";
  assert.throws(
    () => checkOtp("operator@zanclus.test", wrong, now),
    /Kode OTP salah\. Sisa 4 kali/,
  );
  // Spaces typed in the code are ignored; the email is matched loosely.
  assert.equal(
    checkOtp(
      " operator@zanclus.test ",
      code.slice(0, 3) + " " + code.slice(3),
      now,
    ),
    true,
  );
  assert.throws(
    () => checkOtp("operator@zanclus.test", code, now),
    /sudah tidak berlaku/,
  );
  const late = issueOtp("late@zanclus.test", now);
  assert.throws(
    () => checkOtp("late@zanclus.test", late, now + 10 * minute + 1),
    /sudah tidak berlaku/,
  );
});

test("five wrong codes cancel it; new codes wait a minute, five an hour", () => {
  const now = Date.now();
  const code = issueOtp("guess@zanclus.test", now);
  const wrong = code === "123456" ? "654321" : "123456";
  for (let i = 0; i < 4; i++)
    assert.throws(() => checkOtp("guess@zanclus.test", wrong, now), /salah/);
  assert.throws(
    () => checkOtp("guess@zanclus.test", wrong, now),
    /salah 5 kali dan sudah dibatalkan/,
  );
  assert.throws(
    () => checkOtp("guess@zanclus.test", code, now),
    /sudah tidak berlaku/,
  );
  assert.throws(
    () => issueOtp("guess@zanclus.test", now + 30000),
    (error) => error.status === 429 && /1 menit/.test(error.message),
  );
  for (let n = 1; n < 5; n++) issueOtp("guess@zanclus.test", now + n * minute);
  assert.throws(
    () => issueOtp("guess@zanclus.test", now + 5 * minute),
    /5 kode dikirim dalam 1 jam/,
  );
  assert.match(issueOtp("guess@zanclus.test", now + 61 * minute), /^\d{6}$/);
  // A code that could not be emailed does not hold back the next one.
  issueOtp("unsent@zanclus.test", now);
  dropOtp("unsent@zanclus.test");
  assert.match(issueOtp("unsent@zanclus.test", now + 1000), /^\d{6}$/);
});
