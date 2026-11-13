-- ============================================================
-- File: grants.sql
-- Purpose:
--   Apply least-privilege access for the BookStore Co.
--   application runtime and ingestion identities.
--
-- Required psql variables:
--   db_name
--   app_user
--   ingest_user
-- ============================================================

\set ON_ERROR_STOP on

-- Application runtime: operational read/write access.
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO :"app_user";
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO :"app_user";

-- Ingestion runtime: read-only access to the operational source.
GRANT CONNECT ON DATABASE :"db_name" TO :"ingest_user";
GRANT USAGE ON SCHEMA public TO :"ingest_user";
GRANT SELECT
  ON ALL TABLES IN SCHEMA public
  TO :"ingest_user";

-- Future objects created by the role executing this file inherit
-- the corresponding runtime privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO :"ingest_user";
