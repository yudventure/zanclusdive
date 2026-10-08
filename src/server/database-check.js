import "server-only";
import mysql from "mysql2/promise";
import { mysqlSettings } from "../cms-config.js";
import { databaseFailure, connectingHost } from "../database-error.js";

export async function checkDatabase(passwordOverride) {
  const settings = mysqlSettings();
  const overridden = passwordOverride !== undefined;
  const passwordTest = {
    source: overridden ? "form" : "environment",
    ...(overridden ? { matchesRuntime: passwordOverride === settings.password } : {}),
  };
  if (overridden) settings.password = passwordOverride;
  const target = {
    host: settings.host,
    port: settings.port,
    database: settings.database,
    user: settings.user,
    transport: settings.socketPath ? "Unix socket" : "TCP",
  };
  const warnings = [];
  const password = settings.password || "";
  const passwordLabel = overridden ? "Password MySQL pada form uji" : "MYSQL_PASSWORD";
  if (password !== password.trim()) warnings.push(`${passwordLabel} memiliki spasi atau baris baru di tepi. Pastikan itu memang bagian password database.`);
  if (/^(["']).*\1$/s.test(password)) warnings.push(`${passwordLabel} memiliki tanda kutip pembungkus. Nilai pada hPanel harus persis sesuai password database.`);
  let connection;
  try {
    connection = await mysql.createConnection(settings);
    const [rows] = await connection.query("SELECT CURRENT_USER() AS account, USER() AS client, @@hostname AS server, @@port AS port");
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('zanclus_records','zanclus_media','zanclus_login_attempts')",
      [settings.database],
    );
    return { ok: true, version: "database-check-v2", target, passwordTest, warnings, identity: rows[0], tables: tables.map((table) => table.name) };
  } catch (error) {
    // Extract only MySQL's connecting host; never return its raw message or SQL.
    const origin = connectingHost(error);
    return {
      ok: false,
      version: "database-check-v2",
      target,
      passwordTest,
      warnings,
      ...databaseFailure(error),
      ...(origin ? { connectingHost: origin } : {}),
    };
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
