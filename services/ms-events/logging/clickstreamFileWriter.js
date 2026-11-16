import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";

import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

let fileHandle = null;

// Writes are chained so two requests never interleave inside this process.
let pendingWrite = Promise.resolve();

export const initializeClickstreamFileWriter = async () => {
  await mkdir(dirname(config.clickstreamFile.path), { recursive: true });

  // "a" = O_APPEND: every write goes to the current end of the file, which is
  // what lets several replicas share the same file on EFS.
  fileHandle = await open(config.clickstreamFile.path, "a");

  logger.info("Clickstream file writer initialized", {
    path: config.clickstreamFile.path,
  });
};

export const isClickstreamFileAvailable = () => fileHandle !== null;

// Appends all lines with ONE write() call, so a batch lands contiguously in
// the file. Resolves only after the data was written; rejects on I/O errors so
// the caller can answer 5xx and the sidecar retries.
export const writeClickstreamLines = (lines) => {
  if (!fileHandle) {
    return Promise.reject(new Error("Clickstream file is not available"));
  }

  const handle = fileHandle;
  const data = Buffer.from(`${lines.join("\n")}\n`, "utf8");

  const write = pendingWrite.then(() => handle.write(data));
  pendingWrite = write.catch(() => {});

  return write.then(() => undefined);
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
  if (!fileHandle) {
    return;
  }

  const handleToClose = fileHandle;
  fileHandle = null;

  await pendingWrite;
  await handleToClose.close();
};
