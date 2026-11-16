import pg from "pg";
import { config } from "./env.js";

export const pool = new pg.Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
    ? { rejectUnauthorized: config.database.sslRejectUnauthorized }
    : false,
  max: config.database.poolMax,
  idleTimeoutMillis: config.database.idleTimeoutMs,
  connectionTimeoutMillis: config.database.connectionTimeoutMs,
});

export const verifyDatabaseConnection = async () => {
  await pool.query("SELECT 1");
};

export const closeDatabaseConnection = async () => {
  await pool.end();
};
