import "server-only";
import mysql from "mysql2/promise";
import { randomUUID, createHash } from "node:crypto";
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
  withTranslations,
  withRajaAmpatTitle,
  withActivityRefresh,
} from "../content-i18n.js";
import { withPriceList } from "../price-list.js";
import { rememberLocks } from "../developer.js";
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
// Every read and save also tells proxy.js which pages are locked.
export async function getContent() {
  const result = await storedContent();
  rememberLocks(result.content);
  return result;
}
async function storedContent() {
  if (isDemo()) return demo.getContent();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT payload,version FROM zanclus_records WHERE id='site'",
  );
  return {
    content: withPriceList(
      withActivityRefresh(
        withRajaAmpatTitle(
          withTranslations(
            withActivities(
              withPhotography(
                withContactFields(withShop(JSON.parse(rows[0].payload))),
              ),
            ),
          ),
        ),
      ),
    ),
    version: rows[0].version,
  };
}
export async function publicContent() {
  if (isDemo()) return (await getContent()).content;
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
  if (isDemo()) {
    const saved = await demo.saveContent(content, version);
    if (saved) rememberLocks(saved.content);
    return saved;
  }
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
// A booking paid online: checked like a website request, saved at once.
export async function createPaymentBooking(payload) {
  if (isDemo()) return demo.createPaymentBooking(payload);
  const connection = await (await db()).getConnection();
  try {
    await connection.beginTransaction();
    const [contentRows] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE id='site' FOR UPDATE",
    );
    const [bookingRows] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE kind='booking'",
    );
    assertBookable(
      JSON.parse(contentRows[0].payload),
      bookingRows.map((r) => JSON.parse(r.payload)),
      payload,
    );
    const id = randomUUID();
    await connection.execute(
      "INSERT INTO zanclus_records (id,kind,payload) VALUES (?,'booking',?)",
      [id, JSON.stringify(payload)],
    );
    await connection.commit();
    return { id, ...payload };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
// Changes one booking in place; change returns the new booking, or null to
// leave it as it is.
export async function updateBooking(id, change) {
  if (isDemo()) return demo.updateBooking(id, change);
  const connection = await (await db()).getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE id=? AND kind='booking' FOR UPDATE",
      [id],
    );
    if (!rows.length) {
      await connection.commit();
      return null;
    }
    const current = { id, ...JSON.parse(rows[0].payload) };
    const next = change(structuredClone(current));
    if (next) {
      const { id: _id, updatedAt: _at, ...payload } = next;
      await connection.execute(
        "UPDATE zanclus_records SET payload=?,version=version+1 WHERE id=?",
        [JSON.stringify(payload), id],
      );
    }
    await connection.commit();
    return next ? { ...next, id } : current;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
// Travel agents whose calendars are linked with ours.
export async function listAgents() {
  if (isDemo()) return demo.listAgents();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT id,payload FROM zanclus_records WHERE kind='agent' ORDER BY id",
  );
  return rows.map((r) => ({ ...JSON.parse(r.payload), id: r.id }));
}
export async function saveAgent(agent) {
  if (isDemo()) return demo.saveAgent(agent);
  const pool = await db();
  const { id, ...payload } = agent;
  await pool.execute(
    "INSERT INTO zanclus_records (id,kind,payload) VALUES (?,'agent',?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),version=version+1",
    [id, JSON.stringify(payload)],
  );
  return agent;
}
// Changes an agent only if it still exists, so a calendar read that
// finishes late cannot bring back a deleted agent or an old link.
export async function updateAgent(id, change) {
  if (isDemo()) return demo.updateAgent(id, change);
  const connection = await (await db()).getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      "SELECT payload FROM zanclus_records WHERE id=? AND kind='agent' FOR UPDATE",
      [id],
    );
    if (!rows.length) {
      await connection.commit();
      return null;
    }
    const current = { ...JSON.parse(rows[0].payload), id };
    const next = change(structuredClone(current));
    if (next) {
      const { id: _id, ...payload } = next;
      await connection.execute(
        "UPDATE zanclus_records SET payload=?,version=version+1 WHERE id=?",
        [JSON.stringify(payload), id],
      );
    }
    await connection.commit();
    return next ? { ...next, id } : current;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
export async function deleteAgent(id) {
  if (isDemo()) return demo.deleteAgent(id);
  const pool = await db();
  const [r] = await pool.execute(
    "DELETE FROM zanclus_records WHERE id=? AND kind='agent'",
    [id],
  );
  return Boolean(r.affectedRows);
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
// Passwords changed in the admin, by lower-case email: { salt, hash,
// changedAt }. Never part of the content or the admin state.
const passwordId = (email) =>
  "pw:" +
  createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 40);
export async function listPasswords() {
  if (isDemo()) return demo.listPasswords();
  const pool = await db();
  const [rows] = await pool.execute(
    "SELECT payload FROM zanclus_records WHERE kind='password'",
  );
  return Object.fromEntries(
    rows.map((r) => {
      const { email, ...record } = JSON.parse(r.payload);
      return [email, record];
    }),
  );
}
export async function savePassword(email, record) {
  if (isDemo()) return demo.savePassword(email, record);
  const pool = await db();
  const key = email.trim().toLowerCase();
  await pool.execute(
    "INSERT INTO zanclus_records (id,kind,payload) VALUES (?,'password',?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),version=version+1",
    [passwordId(key), JSON.stringify({ email: key, ...record })],
  );
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
