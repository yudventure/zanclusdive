import test from "node:test";
import assert from "node:assert/strict";
import { databaseFailure } from "../src/database-error.js";

test("database errors distinguish credentials, network, database, and permissions", () => {
  const cases = [
    ["ER_ACCESS_DENIED_ERROR", /MYSQL_USER.*MYSQL_PASSWORD/],
    ["ER_HOST_NOT_PRIVILEGED", /IP keluar/],
    ["ER_BAD_DB_ERROR", /MYSQL_DATABASE/],
    ["ER_TABLEACCESS_DENIED_ERROR", /CREATE, SELECT/],
    ["ENOTFOUND", /MYSQL_HOST/],
    ["ECONNREFUSED", /MYSQL_PORT/],
    ["ETIMEDOUT", /Remote MySQL/],
  ];
  for (const [code, pattern] of cases) {
    const result = databaseFailure({ code });
    assert.equal(result.code, code);
    assert.match(result.error, pattern);
  }
});

test("database diagnostics never expose raw driver fields or unknown codes", () => {
  for (const code of ["ER_ACCESS_DENIED_ERROR", "private-test-credential", "toString", undefined]) {
    const result = databaseFailure({ code, message: "private-test-credential", sql: "private-test-query", user: "private-test-user" });
    const output = JSON.stringify(result);
    assert.ok(!output.includes("private-test"));
    assert.deepEqual(Object.keys(result), ["code", "error"]);
  }
});
