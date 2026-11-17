import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { randomUUID } from "node:crypto";

import { config } from "../config/env.js";
import { logger } from "../config/logger.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ROTATED_FILES = 5;

let stream = null;
let fileAvailable = false;
let fileSize = 0;
let pendingWrite = Promise.resolve();

export const initializeClickstreamBufferWriter = async () => {
  const directory = dirname(config.clickstreamBuffer.path);
  await mkdir(directory, { recursive: true });

  try {
    fileSize = (await stat(config.clickstreamBuffer.path)).size;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await openStream();
  logger.info("Clickstream buffer writer initialized", {
    path: config.clickstreamBuffer.path,
  });
};

export const isClickstreamBufferAvailable = () => fileAvailable;

const openStream = async () => {
  const nextStream = createWriteStream(config.clickstreamBuffer.path, {
    flags: "a",
    encoding: "utf8",
  });

  await new Promise((resolve, reject) => {
    const handleOpen = () => {
      cleanup();
      stream = nextStream;
      fileAvailable = true;
      resolve();
    };

    const handleError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      nextStream.off("open", handleOpen);
      nextStream.off("error", handleError);
    };

    nextStream.once("open", handleOpen);
    nextStream.once("error", handleError);
  });

  nextStream.on("error", (error) => {
    fileAvailable = false;
    logger.error("Clickstream buffer writer failed", {
      path: config.clickstreamBuffer.path,
      error: error.message,
    });
  });
};

const rotateFile = async () => {
  const currentStream = stream;
  stream = null;
  fileAvailable = false;

  await new Promise((resolve, reject) => {
    currentStream.once("error", reject);
    currentStream.end(resolve);
  });

  await rename(
    config.clickstreamBuffer.path,
    `${config.clickstreamBuffer.path}.${Date.now()}.${randomUUID()}`
  );
  fileSize = 0;
  await openStream();

  const directory = dirname(config.clickstreamBuffer.path);
  const prefix = `${basename(config.clickstreamBuffer.path)}.`;
  const rotatedFiles = (await readdir(directory))
    .filter((name) => name.startsWith(prefix))
    .sort()
    .reverse();

  await Promise.all(
    rotatedFiles
      .slice(MAX_ROTATED_FILES)
      .map((name) => unlink(`${directory}/${name}`))
  );
};

export const writeClickstreamBufferLine = (line) => {
  const data = Buffer.from(`${line}\n`, "utf8");
  const write = pendingWrite.then(async () => {
    if (!stream || !fileAvailable) {
      throw new Error("Clickstream buffer is not available");
    }

    if (fileSize + data.length > MAX_FILE_SIZE_BYTES) {
      await rotateFile();
    }

    await new Promise((resolve, reject) => {
      stream.write(data, (error) => (error ? reject(error) : resolve()));
    });
    fileSize += data.length;
  });

  pendingWrite = write.catch((error) => {
    logger.error("Clickstream buffer write failed", {
      path: config.clickstreamBuffer.path,
      error: error.message,
    });
  });
};

export const closeClickstreamBufferWriter = async () => {
  await pendingWrite;

  const streamToClose = stream;
  stream = null;
  fileAvailable = false;

  if (!streamToClose) {
    return;
  }

  await new Promise((resolve, reject) => {
    streamToClose.once("error", reject);
    streamToClose.end(resolve);
  });
};
