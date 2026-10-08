import "server-only";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { defaultContent } from "../cms-model.js";
import { databaseIssues, mysqlSettings } from "../cms-config.js";
import { databaseFailure } from "../database-error.js";
import { isDemo } from "../cms-mode.js";
import * as demo from "./demo-store.js";
import { withShop } from "../shop-model.js";
import { withContactFields } from "../contact-model.js";
import { withActivities } from "../activity-model.js";
import { withPhotography } from "../photography.js";
import {
  assertBookable,
  bookingReceipt,
  BookingError,
} from "../booking-model.js";
export function databaseConfigured() {
  return databaseIssues().length === 0;
}
async function db() {
  if (!databaseConfigured()) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalThis.__zanclusDB) {
    globalThis.__zanclusDB = (async () => {
      const pool = mysql.createPool({
        ...mysqlSettings(),
        connectionLimit: 4,
      });
      try {
        await pool.execute(
          "CREATE TABLE IF NOT EXISTS zanclus_records (id VARCHAR(50) PRIMARY KEY, kind VARCHAR(30) NOT NULL, payload LONGTEXT NOT NULL, version INT NOT NULL DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) CHARACTER SET utf8mb4",
        );
        await pool.execute(
          "CREATE TABLE IF NOT EXISTS zanclus_media (id CHAR(36) PRIMARY KEY, name VARCHAR(150) NOT NULL, mime VARCHAR(40) NOT NULL, data MEDIUMBLOB NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4",
        );
        await pool.execute(
          "CREATE TABLE IF NOT EXISTS zanclus_login_attempts (id VARCHAR(50) PRIMARY KEY, attempts INT NOT NULL, window_start BIGINT NOT NULL)",
        );
        await pool.execute(
          "INSERT IGNORE INTO zanclus_records (id,kind,payload) VALUES ('site','content',?)",
          [JSON.stringify(defaultContent)],
        );
        return pool;
      } catch (error) {
        await pool.end().catch(() => {});
        throw error;
      }
    })().catch((error) => {
      delete globalThis.__zanclusDB;
      throw error;
    });
  }
  return globalThis.__zanclusDB;
}
export async function getContent() {
  if (isDemo()) return demo.getContent();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT payload,version FROM zanclus_records WHERE id='site'",
  );
  return {
    content: withActivities(
      withPhotography(withContactFields(withShop(JSON.parse(rows[0].payload)))),
    ),
    version: rows[0].version,
  };
}
export async function publicContent() {
  if (isDemo()) return (await demo.getContent()).content;
  if (!databaseConfigured()) return structuredClone(defaultContent);
  try {
    return (await getContent()).content;
  } catch (error) {
    console.error(
      "CMS: content database unavailable; using website defaults.",
      databaseFailure(error).code,
    );
    return structuredClone(defaultContent);
  }
}
export async function saveContent(content, version) {
  if (isDemo()) return demo.saveContent(content, version);
  const pool = await db();
  const [result] = await pool.execute(
    "UPDATE zanclus_records SET payload=?,version=version+1 WHERE id='site' AND version=?",
    [JSON.stringify(content), version],
  );
  if (!result.affectedRows) return false;
  return getContent();
}
export async function listBookings() {
  if (isDemo()) return demo.listBookings();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT id,payload,updated_at FROM zanclus_records WHERE kind='booking' ORDER BY updated_at DESC",
  );
  return rows.map((r) => ({
    id: r.id,
    ...JSON.parse(r.payload),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}
export async function saveBooking(payload, id) {
  if (isDemo()) return demo.saveBooking(payload, id);
  const pool = await db();
  if (id) {
    const [result] = await pool.execute(
      "UPDATE zanclus_records SET payload=?,version=version+1 WHERE id=? AND kind='booking'",
      [JSON.stringify(payload), id],
    );
    return result.affectedRows ? { id, ...payload } : null;
  }
  const newID = randomUUID();
  await pool.execute(
    "INSERT INTO zanclus_records (id,kind,payload) VALUES (?,'booking',?)",
    [newID, JSON.stringify(payload)],
  );
  return { id: newID, ...payload };
}
export async function createBookingRequest(payload, requestId, fingerprint) {
  if (isDemo())
    return demo.createBookingRequest(payload, requestId, fingerprint);
  const connection = await (await db()).getConnection();
  try {
    await connection.beginTransaction();
    const requestKey = "request:" + requestId;
    await connection.execute(
      // Acquire an exclusive row lock for retries. INSERT IGNORE can acquire
      // shared duplicate-key locks and deadlock with simultaneous retries.
      "INSERT INTO zanclus_records (id,kind,payload) VALUES (?,'booking-request',?) ON DUPLICATE KEY UPDATE id=id",
      [requestKey, JSON.stringify({ fingerprint })],
    );
    const [requests] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE id=? AND kind='booking-request' FOR UPDATE",
      [requestKey],
    );
    const previous = JSON.parse(requests[0].payload);
    if (previous.fingerprint !== fingerprint)
      throw new BookingError(
        "Permintaan ini sudah dikirim. Buat booking baru untuk data berbeda.",
        409,
      );
    if (previous.receipt) {
      await connection.commit();
      return { receipt: previous.receipt, created: false };
    }
    const [contentRows] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE id='site'",
    );
    const [bookingRows] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE kind='booking'",
    );
    assertBookable(
      JSON.parse(contentRows[0].payload),
      bookingRows.map((r) => JSON.parse(r.payload)),
      payload,
    );
    const id = randomUUID(),
      receipt = bookingReceipt({ id, ...payload }, false);
    await connection.execute(
      "INSERT INTO zanclus_records (id,kind,payload) VALUES (?,'booking',?)",
      [id, JSON.stringify(payload)],
    );
    await connection.execute(
      "UPDATE zanclus_records SET payload=? WHERE id=?",
      [JSON.stringify({ fingerprint, receipt }), requestKey],
    );
    await connection.commit();
    return { receipt, created: true };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
export async function deleteBooking(id) {
  if (isDemo()) return demo.deleteBooking(id);
  const pool = await db();
  const [r] = await pool.execute(
    "DELETE FROM zanclus_records WHERE id=? AND kind='booking'",
    [id],
  );
  return Boolean(r.affectedRows);
}
export async function listMedia() {
  if (isDemo()) return demo.listMedia();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT id,name,mime,OCTET_LENGTH(data) AS bytes,created_at FROM zanclus_media ORDER BY created_at DESC",
  );
  return rows.map((r) => ({
    ...r,
    url: "/api/media/" + r.id,
    created_at: new Date(r.created_at).toISOString(),
  }));
}
export async function addMedia(name, mime, data) {
  if (isDemo()) return demo.addMedia(name, mime, data);
  const pool = await db(),
    id = randomUUID();
  await pool.execute(
    "INSERT INTO zanclus_media (id,name,mime,data) VALUES (?,?,?,?)",
    [id, name, mime, data],
  );
  return { id, url: "/api/media/" + id, name, mime, bytes: data.length };
}
export async function getMedia(id) {
  if (isDemo()) return demo.getMedia(id);
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT mime,data FROM zanclus_media WHERE id=?",
    [id],
  );
  return rows[0] || null;
}
export async function loginBlocked() {
  if (isDemo()) return demo.loginBlocked();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT attempts,window_start FROM zanclus_login_attempts WHERE id='owner'",
  );
  return Boolean(
    rows[0] &&
    Date.now() - Number(rows[0].window_start) < 900000 &&
    rows[0].attempts >= 8,
  );
}
export async function failLogin() {
  if (isDemo()) return demo.failLogin();
  const pool = await db();
  await pool.execute(
    "INSERT INTO zanclus_login_attempts (id,attempts,window_start) VALUES ('owner',1,?) ON DUPLICATE KEY UPDATE attempts=IF(window_start<?,1,attempts+1),window_start=IF(window_start<?,?,window_start)",
    [Date.now(), Date.now() - 900000, Date.now() - 900000, Date.now()],
  );
}
export async function clearLoginFailures() {
  if (isDemo()) return demo.clearLoginFailures();
  const pool = await db();
  await pool.execute("DELETE FROM zanclus_login_attempts WHERE id='owner'");
}
