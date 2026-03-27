import { getDb } from "./db.js";
import { logger } from "./logger.js";

export function auditLog(actorSub, action, meta = {}) {
  try {
    const db = getDb();
    const ts = Date.now();
    const metaJson = JSON.stringify(meta);
    db.prepare(
      `INSERT INTO audit_log (ts, actor_sub, action, meta_json) VALUES (?, ?, ?, ?)`
    ).run(ts, actorSub ?? null, action, metaJson);
  } catch (err) {
    logger.error(
      { err, actorSub: actorSub ?? null, action },
      "audit_write_failed"
    );
  }
}

export function getRecentAudit(limit = 100) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, ts, actor_sub, action, meta_json FROM audit_log
       ORDER BY id DESC LIMIT ?`
    )
    .all(Math.min(500, Math.max(1, limit)));
  return rows.map((r) => {
    let meta = {};
    if (r.meta_json) {
      try {
        meta = JSON.parse(r.meta_json);
      } catch (err) {
        logger.warn({ err, auditId: r.id }, "audit_meta_parse_failed");
      }
    }
    return {
      id: r.id,
      ts: r.ts,
      actor_sub: r.actor_sub,
      action: r.action,
      meta,
    };
  });
}
