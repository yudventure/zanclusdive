import "server-only";
import mysql from "mysql2/promise";
import { mysqlSettings } from "../cms-config.js";
import { databaseFailure } from "../database-error.js";

export async function checkDatabase() {
  const settings = mysqlSettings();
  const target = {
    host: settings.host,
    port: settings.port,
    database: settings.database,
    user: settings.user,
    transport: settings.socketPath ? "Unix socket" : "TCP",
  };
  const warnings = [];
  const password = settings.password || "";
  if (password !== password.trim()) warnings.push("MYSQL_PASSWORD memiliki spasi atau baris baru di tepi. Pastikan itu memang bagian password database.");
  if (/^(["']).*\1$/s.test(password)) warnings.push("MYSQL_PASSWORD memiliki tanda kutip pembungkus. Nilai pada hPanel harus persis sesuai password database.");
  let connection;
  try {
    connection = await mysql.createConnection(settings);
    const [rows] = await connection.query("SELECT CURRENT_USER() AS account, USER() AS client, @@hostname AS server, @@port AS port");
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('zanclus_records','zanclus_media','zanclus_login_attempts')",
      [settings.database],
    );
    return { ok: true, version: "database-check-v1", target, warnings, identity: rows[0], tables: tables.map((table) => table.name) };
  } catch (error) {
    // Extract only MySQL's connecting host; never return its raw message or SQL.
    const match = error.code === "ER_ACCESS_DENIED_ERROR"
      ? error.message?.match(/Access denied for user '[^']*'@'([A-Za-z0-9_.:%-]{1,255})'/)
      : null;
    return {
      ok: false,
      version: "database-check-v1",
      target,
      warnings,
      ...databaseFailure(error),
      ...(match ? { connectingHost: match[1] } : {}),
    };
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
