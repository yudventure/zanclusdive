import test from "node:test";
import assert from "node:assert/strict";
import { configurationIssues } from "../src/cms-config.js";

const valid = {
  MYSQL_HOST: "database.example.test",
  MYSQL_DATABASE: "cms_test",
  MYSQL_USER: "cms_owner",
  MYSQL_PASSWORD: "test-only-database-value",
  ADMIN_EMAIL: "owner@example.test",
  ADMIN_PASSWORD: "test-only-admin-value",
  SESSION_SECRET: "test-only-session-value-with-32-characters",
};

test("complete CMS configuration has no issues", () => {
  assert.deepEqual(configurationIssues(valid), []);
});

test("CMS diagnostics isolate missing credentials without exposing values", () => {
  const issues = configurationIssues({ ...valid, MYSQL_PASSWORD: "" });
  assert.deepEqual(issues.map((issue) => issue.name), ["MYSQL_PASSWORD"]);
  const serialized = JSON.stringify(issues);
  for (const value of Object.values(valid)) assert.ok(!serialized.includes(value));
});

test("short admin password and session secret remain blocked", () => {
  const issues = configurationIssues({ ...valid, ADMIN_PASSWORD: "short", SESSION_SECRET: "short" });
  assert.deepEqual(issues.map((issue) => issue.name), ["ADMIN_PASSWORD", "SESSION_SECRET"]);
  assert.match(issues[0].reason, /12/);
  assert.match(issues[1].reason, /32/);
});

test("whitespace-only settings are missing and configuration is checked on each call", () => {
  const env = { ...valid, MYSQL_HOST: "   " };
  assert.equal(configurationIssues(env)[0].name, "MYSQL_HOST");
  env.MYSQL_HOST = valid.MYSQL_HOST;
  assert.deepEqual(configurationIssues(env), []);
});
