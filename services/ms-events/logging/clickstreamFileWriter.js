import { mkdir, open, stat, unlink } from "node:fs/promises";
import { dirname } from "node:path";

import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

const LOCK_RETRY_MIN_MS = 10;
const LOCK_RETRY_JITTER_MS = 15;
const LOCK_TIMEOUT_MS = 5000;
const STALE_LOCK_MS = 15000;

let fileAvailable = false;

// Writes are chained so two requests never interleave inside this process.
let pendingWrite = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// NFSv4/EFS does not guarantee atomic O_APPEND across nodes, and page-cache
// writes only flush/revalidate on open+close. Serialize appends across pods
// with an exclusive lock file (NFSv4 CREATE EXCLUSIVE is atomic).
const acquireLock = async (lockPath) => {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.close();
      return;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      try {
        const info = await stat(lockPath);
        if (Date.now() - info.mtimeMs > STALE_LOCK_MS) {
          // shortcut: stale-lock unlink has a narrow race after a 15s pod crash; switch to flock/DB if crash contention occurs
          await unlink(lockPath).catch((unlinkError) => {
            if (unlinkError.code !== "ENOENT") {
              throw unlinkError;
            }
          });
          continue;
        }
      } catch (statError) {
        if (statError.code === "ENOENT") {
          continue;
        }
        throw statError;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring clickstream lock ${lockPath}`);
      }

      await sleep(
        LOCK_RETRY_MIN_MS + Math.floor(Math.random() * LOCK_RETRY_JITTER_MS)
      );
    }
  }
};

const appendSynced = async (filePath, data) => {
  const handle = await open(filePath, "a");
  try {
    let offset = 0;
    while (offset < data.length) {
      const { bytesWritten } = await handle.write(
        data,
        offset,
        data.length - offset
      );
      offset += bytesWritten;
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
};

export const initializeClickstreamFileWriter = async () => {
  await mkdir(dirname(config.clickstreamFile.path), { recursive: true });
  const handle = await open(config.clickstreamFile.path, "a");
  await handle.close();
  fileAvailable = true;

  logger.info("Clickstream file writer initialized", {
    path: config.clickstreamFile.path,
  });
};

export const isClickstreamFileAvailable = () => fileAvailable;

// Appends all lines under a shared lock and fsyncs before closing so replicas
// across AZs revalidate EOF on EFS instead of overwriting or leaving NUL holes.
export const writeClickstreamLines = (lines) => {
  if (!fileAvailable) {
    return Promise.reject(new Error("Clickstream file is not available"));
  }

  const filePath = config.clickstreamFile.path;
  const lockPath = `${filePath}.lock`;
  const data = Buffer.from(`${lines.join("\n")}\n`, "utf8");

  const write = pendingWrite.then(async () => {
    await acquireLock(lockPath);
    try {
      await appendSynced(filePath, data);
    } finally {
      await unlink(lockPath).catch((error) => {
        if (error.code !== "ENOENT") {
          logger.error("Failed to remove clickstream lock file", {
            path: lockPath,
            error: error.message,
          });
        }
      });
    }
  });
  pendingWrite = write.catch(() => {});

  return write;
};

// Same contract as ms-books: a single line, fire-and-forget, never throws.
export const writeClickstreamLine = (line) => {
  writeClickstreamLines([line]).catch((error) => {
    logger.error("Clickstream file write failed", {
      path: config.clickstreamFile.path,
      error: error.message,
    });
  });
};

export const closeClickstreamFileWriter = async () => {
  if (!fileAvailable) {
    return;
  }

  fileAvailable = false;
  await pendingWrite;
};
