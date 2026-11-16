import "dotenv/config";

// Only the variables ms-auth really needs. Everything but the database
// credentials and the JWT secret has a default that matches the monolith,
// so existing SPA cookies keep working.

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

const jwtSecret = read("AUTH_JWT_SECRET");

if (jwtSecret.length < 32) {
  throw new Error("AUTH_JWT_SECRET must contain at least 32 characters");
}

const jwtAlgorithm = read("AUTH_JWT_ALGORITHM", "HS256");

if (jwtAlgorithm !== "HS256") {
  throw new Error("AUTH_JWT_ALGORITHM must be HS256");
}

const cookieSameSite = read("AUTH_COOKIE_SAME_SITE", "lax").toLowerCase();

if (!["lax", "strict", "none"].includes(cookieSameSite)) {
  throw new Error("AUTH_COOKIE_SAME_SITE must be lax, strict, or none");
}

const cookieSecure = readBoolean("AUTH_COOKIE_SECURE", false);

if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE is none");
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
    serviceName: read("SERVICE_NAME", "ms-auth"),
    port: readInteger("PORT", 5001),
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
  auth: Object.freeze({
    jwt: Object.freeze({
      secret: jwtSecret,
      algorithm: jwtAlgorithm,
      issuer: read("AUTH_JWT_ISSUER", "bookstore-api"),
      audience: read("AUTH_JWT_AUDIENCE", "bookstore-web"),
      ttlSeconds: readInteger("AUTH_TOKEN_TTL_SECONDS", 28800),
    }),
    cookie: Object.freeze({
      name: read("AUTH_COOKIE_NAME", "bookstore_session"),
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: read("AUTH_COOKIE_PATH", "/api"),
    }),
  }),
});
