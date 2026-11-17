import "dotenv/config";
import { resolve } from "node:path";

// Only the variables ms-events really needs (no database, no JWT).

const read = (name, fallback) => {
  const value = process.env[name]?.trim();

  if (value) return value;
  if (fallback !== undefined) return fallback;

  throw new Error(`Missing required environment variable: ${name}`);
};

const readInteger = (name, fallback) => {
  const value = Number.parseInt(read(name, String(fallback)), 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};

const readBoolean = (name, fallback) => {
  const value = read(name, String(fallback)).toLowerCase();

  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be either true or false`);
  }

  return value === "true";
};

// ms-events is the only service that writes to the shared EFS volume.
const clickstreamFilePath = read(
  "CLICKSTREAM_FILE_PATH",
  "/usr/src/app/logs/clickstream.log"
);
const clickstreamBufferPath = read(
  "CLICKSTREAM_BUFFER_PATH",
  "/var/log/clickstream/events.log"
);

if (!clickstreamFilePath.startsWith("/")) {
  throw new Error("CLICKSTREAM_FILE_PATH must be an absolute path");
}

if (!clickstreamBufferPath.startsWith("/")) {
  throw new Error("CLICKSTREAM_BUFFER_PATH must be an absolute path");
}

if (resolve(clickstreamFilePath) === resolve(clickstreamBufferPath)) {
  throw new Error("CLICKSTREAM_FILE_PATH and CLICKSTREAM_BUFFER_PATH must differ");
}

export const config = Object.freeze({
  app: Object.freeze({
    environment: read("NODE_ENV", "development"),
    serviceName: read("SERVICE_NAME", "ms-events"),
    port: readInteger("PORT", 5004),
  }),
  http: Object.freeze({
    trustProxyHops: Number.parseInt(read("HTTP_TRUST_PROXY_HOPS", "1"), 10),
    jsonBodyLimit: read("HTTP_JSON_BODY_LIMIT", "32kb"),
    corsOrigins: Object.freeze(
      read("CORS_ORIGINS", "http://localhost:3000,http://localhost:8080")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
  }),
  ingest: Object.freeze({
    // Batches come from pod sidecars, so they are larger than browser events
    bodyLimit: read("INGEST_JSON_BODY_LIMIT", "1mb"),
    maxBatchSize: readInteger("INGEST_MAX_BATCH_SIZE", 1000),
    maxLineLength: readInteger("INGEST_MAX_LINE_LENGTH", 8192),
  }),
  accessLog: Object.freeze({
    enabled: readBoolean("ACCESS_LOG_ENABLED", true),
    excludedPaths: Object.freeze(["/health"]),
    maxFieldLength: 2048,
    requestIdHeader: "X-Request-Id",
  }),
  clickstreamFile: Object.freeze({
    path: clickstreamFilePath,
  }),
  clickstreamBuffer: Object.freeze({
    path: clickstreamBufferPath,
  }),
});
