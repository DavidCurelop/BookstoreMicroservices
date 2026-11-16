import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../errors/AppError.js";
import { writeClickstreamLines } from "../logging/clickstreamFileWriter.js";

const invalid = (message) =>
  new AppError(message, 400, "INVALID_EVENT_BATCH");

// One record = one line: line breaks inside a value must never create extra lines.
const toSingleLine = (value) => value.replace(/[\r\n]+/g, " ").trim();

const normalizeLines = (lines) => {
  if (!Array.isArray(lines)) {
    throw invalid("lines must be an array of strings");
  }

  return lines.map((line, index) => {
    if (typeof line !== "string") {
      throw invalid(`lines[${index}] must be a string`);
    }

    return toSingleLine(line);
  });
};

const normalizeRecords = (records) => {
  if (!Array.isArray(records)) {
    throw invalid("records must be an array of objects");
  }

  return records.map((record, index) => {
    if (record === null || typeof record !== "object" || Array.isArray(record)) {
      throw invalid(`records[${index}] must be an object`);
    }

    // JSON.stringify escapes line breaks, so the result is already one line
    return JSON.stringify(record);
  });
};

// Body: { lines?: string[], records?: object[] }
//   lines   -> already formatted clickstream lines (sidecar forwards them as is)
//   records -> structured JSON records, stored as one JSON line each
export const ingestEvents = async (req, res) => {
  const { lines, records } = req.body ?? {};

  if (lines === undefined && records === undefined) {
    throw invalid("Provide lines and/or records");
  }

  const batch = [
    ...(lines === undefined ? [] : normalizeLines(lines)),
    ...(records === undefined ? [] : normalizeRecords(records)),
  ].filter(Boolean);

  if (batch.length === 0) {
    throw invalid("The batch has no events");
  }

  if (batch.length > config.ingest.maxBatchSize) {
    throw new AppError(
      `The batch cannot have more than ${config.ingest.maxBatchSize} events`,
      413,
      "EVENT_BATCH_TOO_LARGE"
    );
  }

  if (batch.some((line) => line.length > config.ingest.maxLineLength)) {
    throw new AppError(
      `Each event cannot exceed ${config.ingest.maxLineLength} characters`,
      413,
      "EVENT_BATCH_TOO_LARGE"
    );
  }

  try {
    await writeClickstreamLines(batch);
  } catch (error) {
    logger.error("Clickstream batch write failed", { error: error.message });
    // 503 tells the sidecar the batch was NOT stored and must be retried
    throw new AppError(
      "Clickstream storage is unavailable",
      503,
      "CLICKSTREAM_STORAGE_UNAVAILABLE"
    );
  }

  res.set("Cache-Control", "no-store");
  res.status(200).json({ written: batch.length });
};
