import test from "node:test";
import assert from "node:assert/strict";
import { configurationIssues, mysqlSettings } from "../src/cms-config.js";

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

test("MySQL settings trim identifiers but preserve exact password bytes", () => {
  const password = '  secret#with$dollar"and spaces  ';
  const settings = mysqlSettings({ ...valid, MYSQL_HOST: " localhost\n", MYSQL_USER: " cms_owner ", MYSQL_DATABASE: " cms_test ", MYSQL_PASSWORD: password });
  assert.equal(settings.host, "127.0.0.1");
  assert.equal(settings.user, "cms_owner");
  assert.equal(settings.database, "cms_test");
  assert.equal(settings.password, password);
  assert.equal(settings.port, 3306);
  assert.equal(settings.socketPath, undefined);
  assert.equal(mysqlSettings({ ...valid, MYSQL_SOCKET: " /tmp/mysql.sock " }).socketPath, "/tmp/mysql.sock");
});

test("localhost TCP uses IPv4 while explicit hosts and sockets are preserved", () => {
  assert.equal(mysqlSettings({ ...valid, MYSQL_HOST: "LOCALHOST" }).host, "127.0.0.1");
  assert.equal(mysqlSettings({ ...valid, MYSQL_HOST: "::1" }).host, "::1");
  assert.equal(mysqlSettings(valid).host, valid.MYSQL_HOST);
  const socket = mysqlSettings({ ...valid, MYSQL_HOST: "localhost", MYSQL_SOCKET: "/tmp/mysql.sock" });
  assert.equal(socket.host, "localhost");
  assert.equal(socket.socketPath, "/tmp/mysql.sock");
});

test("bad port, URL hostname, and pasted secret placeholders are blocked", () => {
  assert.ok(configurationIssues({ ...valid, MYSQL_PORT: "not-a-port" }).some((issue) => issue.name === "MYSQL_PORT"));
  assert.ok(configurationIssues({ ...valid, MYSQL_HOST: "https://localhost/" }).some((issue) => issue.name === "MYSQL_HOST"));
  const issues = configurationIssues({ ...valid, MYSQL_PASSWORD: "GANTI_DENGAN_PASSWORD_USER_MYSQL", ADMIN_PASSWORD: "GANTI_DENGAN_PASSWORD_ADMIN_MINIMAL_12_KARAKTER", SESSION_SECRET: "GANTI_DENGAN_STRING_ACAK_MINIMAL_32_KARAKTER" });
  assert.deepEqual(issues.map((issue) => issue.name), ["MYSQL_PASSWORD", "ADMIN_PASSWORD", "SESSION_SECRET"]);
});
