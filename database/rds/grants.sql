-- ============================================================
-- File: grants.sql
-- Purpose:
--   Apply least-privilege access per domain schema for the
--   BookStore Co. microservices, monolith compatibility, and
--   ingestion identities.
--
-- Required psql variables:
--   db_name
--   auth_user
--   books_user
--   orders_user
--   app_user
--   ingest_user
-- ============================================================

\set ON_ERROR_STOP on

-- Prevent cross-schema access between microservice identities.
REVOKE ALL ON SCHEMA auth FROM PUBLIC, :"books_user", :"orders_user";
REVOKE ALL ON SCHEMA books FROM PUBLIC, :"auth_user", :"orders_user";
REVOKE ALL ON SCHEMA orders FROM PUBLIC, :"auth_user", :"books_user";

REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC, :"books_user", :"orders_user";
REVOKE ALL ON ALL TABLES IN SCHEMA books FROM PUBLIC, :"auth_user", :"orders_user";
REVOKE ALL ON ALL TABLES IN SCHEMA orders FROM PUBLIC, :"auth_user", :"books_user";

-- ms-auth: read/write strictly on auth schema.
GRANT CONNECT ON DATABASE :"db_name" TO :"auth_user";
GRANT USAGE ON SCHEMA auth TO :"auth_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO :"auth_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO :"auth_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"auth_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
  GRANT USAGE, SELECT ON SEQUENCES TO :"auth_user";
ALTER ROLE :"auth_user" SET search_path = auth, public;

-- ms-books: read/write strictly on books schema.
GRANT CONNECT ON DATABASE :"db_name" TO :"books_user";
GRANT USAGE ON SCHEMA books TO :"books_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA books TO :"books_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA books TO :"books_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA books
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"books_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA books
  GRANT USAGE, SELECT ON SEQUENCES TO :"books_user";
ALTER ROLE :"books_user" SET search_path = books, public;

-- ms-orders: read/write strictly on orders schema.
GRANT CONNECT ON DATABASE :"db_name" TO :"orders_user";
GRANT USAGE ON SCHEMA orders TO :"orders_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orders TO :"orders_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA orders TO :"orders_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA orders
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"orders_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA orders
  GRANT USAGE, SELECT ON SEQUENCES TO :"orders_user";
ALTER ROLE :"orders_user" SET search_path = orders, public;

-- Monolith compatibility runtime until services are extracted (US-02..US-04).
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA auth, books, orders, public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA auth, books, orders
  TO :"app_user";
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA auth, books, orders
  TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, books, orders
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, books, orders
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
ALTER ROLE :"app_user" SET search_path = auth, books, orders, public;

-- Ingestion runtime: read-only access across operational schemas.
GRANT CONNECT ON DATABASE :"db_name" TO :"ingest_user";
GRANT USAGE ON SCHEMA auth, books, orders, public TO :"ingest_user";
GRANT SELECT
  ON ALL TABLES IN SCHEMA auth, books, orders
  TO :"ingest_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, books, orders
  GRANT SELECT ON TABLES TO :"ingest_user";
ALTER ROLE :"ingest_user" SET search_path = auth, books, orders, public;
