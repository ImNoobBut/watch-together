/**
 * Shared CORS settings for Express and Socket.IO.
 * Set CORS_ORIGIN to a comma-separated list of allowed browser origins when the
 * client is on a different host (e.g. Railway static + API). Example:
 * CORS_ORIGIN=https://your-client.up.railway.app
 * If unset, the request Origin is reflected (works for most local + many hosted setups).
 */
export function createCorsOptions() {
  const raw = process.env.CORS_ORIGIN?.trim();
  const list = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const origin =
    list && list.length > 0
      ? (requestOrigin, cb) => {
          if (!requestOrigin) return cb(null, true);
          if (list.includes(requestOrigin)) return cb(null, requestOrigin);
          cb(null, false);
        }
      : true;

  return {
    origin,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86_400,
  };
}
