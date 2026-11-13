-- ============================================================
-- File: create_roles.sql
-- Purpose:
--   Ensure the database login roles required by BookStore Co.
--   exist and converge to the credentials supplied at runtime.
--
-- Required psql variables:
--   app_user
--   app_password
--   ingest_user
--   ingest_password
-- ============================================================

\set ON_ERROR_STOP on

SELECT format(
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
      THEN 'ALTER ROLE %I LOGIN PASSWORD %L'
    ELSE 'CREATE ROLE %I LOGIN PASSWORD %L'
  END,
  :'app_user',
  :'app_password'
)
\gexec

SELECT format(
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ingest_user')
      THEN 'ALTER ROLE %I LOGIN PASSWORD %L'
    ELSE 'CREATE ROLE %I LOGIN PASSWORD %L'
  END,
  :'ingest_user',
  :'ingest_password'
)
\gexec
