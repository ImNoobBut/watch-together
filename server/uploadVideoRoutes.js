import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import { requireAuth } from "./httpAuth.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Writable directory for temporary room video uploads. */
export const UPLOAD_DIR = path.join(__dirname, "uploads", "video");

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SIZE = 350 * 1024 * 1024;

const ALLOWED_EXT = new Set([".mp4", ".webm", ".ogg", ".mov"]);

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
ensureDir();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = ALLOWED_EXT.has(ext) ? ext : ".mp4";
    cb(null, `${nanoid(16)}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (!file.mimetype || !/^video\//i.test(file.mimetype)) {
      return cb(new Error("Only video files are allowed"));
    }
    cb(null, true);
  },
});

export function createUploadRouter() {
  const router = express.Router();
  router.post("/upload-video", requireAuth, (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: "File too large" });
          }
          return res.status(400).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      if (!req.file) return res.status(400).json({ error: "No file" });
      const url = `/media/video/${req.file.filename}`;
      res.json({ url });
    });
  });
  return router;
}

const SAFE_FILENAME = /^[A-Za-z0-9_-]{12,24}\.(mp4|webm|ogg|mov)$/i;

export function registerVideoMediaRoute(app) {
  app.get("/media/video/:filename", (req, res, next) => {
    const { filename } = req.params;
    if (!SAFE_FILENAME.test(filename)) {
      return res.status(400).end();
    }
    const filePath = path.join(UPLOAD_DIR, path.basename(filename));
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return res.status(400).end();
    }
    res.sendFile(filePath, { acceptRanges: true }, (err) => {
      if (err) next(err);
    });
  });
}

export function startUploadCleanupTimer() {
  const tick = () => {
    try {
      const now = Date.now();
      let names;
      try {
        names = fs.readdirSync(UPLOAD_DIR);
      } catch {
        return;
      }
      for (const name of names) {
        const full = path.join(UPLOAD_DIR, name);
        let stat;
        try {
          stat = fs.statSync(full);
        } catch {
          continue;
        }
        if (stat.isFile() && now - stat.mtimeMs > TTL_MS) {
          fs.unlinkSync(full);
          logger.info({ name }, "upload_video_expired");
        }
      }
    } catch (e) {
      logger.warn({ err: e }, "upload_cleanup_failed");
    }
  };
  tick();
  const interval = setInterval(tick, 60 * 60 * 1000);
  interval.unref();
}
