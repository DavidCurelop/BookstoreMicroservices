import "dotenv/config";

// Only the variables ms-books really needs.

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

const booksDefaultLimit = readInteger("BOOKS_DEFAULT_LIMIT", 24);
const booksMaxLimit = readInteger("BOOKS_MAX_LIMIT", 100);

if (booksDefaultLimit > booksMaxLimit) {
  throw new Error("BOOKS_DEFAULT_LIMIT cannot be greater than BOOKS_MAX_LIMIT");
}

const clickstreamFileEnabled = readBoolean("CLICKSTREAM_FILE_ENABLED", true);
const clickstreamFilePath = read(
  "CLICKSTREAM_FILE_PATH",
  "/var/log/clickstream/events.log"
);

if (clickstreamFileEnabled && !clickstreamFilePath.startsWith("/")) {
  throw new Error("CLICKSTREAM_FILE_PATH must be an absolute path");
}

export const config = Object.freeze({
  app: Object.freeze({
    environment: read("NODE_ENV", "development"),
    serviceName: read("SERVICE_NAME", "ms-books"),
    port: readInteger("PORT", 5002),
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
  books: Object.freeze({
    defaultLimit: booksDefaultLimit,
    maxLimit: booksMaxLimit,
    // Max distinct books per reserve/release call (same default as ORDERS_MAX_DISTINCT_ITEMS)
    maxItemsPerRequest: readInteger("STOCK_MAX_ITEMS_PER_REQUEST", 100),
    maxQuantityPerItem: readInteger("STOCK_MAX_QUANTITY_PER_ITEM", 1000),
  }),
  accessLog: Object.freeze({
    enabled: readBoolean("ACCESS_LOG_ENABLED", true),
    excludedPaths: Object.freeze(["/health"]),
    maxFieldLength: 2048,
    requestIdHeader: "X-Request-Id",
  }),
  clickstreamFile: Object.freeze({
    enabled: clickstreamFileEnabled,
    path: clickstreamFilePath,
  }),
  database: Object.freeze({
    host: read("DB_HOST"),
    port: readInteger("DB_PORT", 5432),
    name: read("DB_NAME"),
    user: read("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    ssl: readBoolean("DB_SSL", false),
    sslRejectUnauthorized: readBoolean("DB_SSL_REJECT_UNAUTHORIZED", false),
    poolMax: readInteger("DB_POOL_MAX", 10),
    idleTimeoutMs: readInteger("DB_IDLE_TIMEOUT_MS", 30000),
    connectionTimeoutMs: readInteger("DB_CONNECTION_TIMEOUT_MS", 5000),
  }),
});
