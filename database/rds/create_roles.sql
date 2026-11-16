-- ============================================================
-- File: create_roles.sql
-- Purpose:
--   Ensure the database login roles required by BookStore Co.
--   exist and converge to the credentials supplied at runtime.
--
-- Required psql variables:
--   auth_user, auth_password
--   books_user, books_password
--   orders_user, orders_password
--   app_user, app_password
--   ingest_user, ingest_password
-- ============================================================

\set ON_ERROR_STOP on

SELECT format(
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r.role_name)
      THEN 'ALTER ROLE %I LOGIN PASSWORD %L'
    ELSE 'CREATE ROLE %I LOGIN PASSWORD %L'
  END,
  r.role_name,
  r.role_password
)
FROM (
  VALUES
    (:'auth_user', :'auth_password'),
    (:'books_user', :'books_password'),
    (:'orders_user', :'orders_password'),
    (:'app_user', :'app_password'),
    (:'ingest_user', :'ingest_password')
) AS r(role_name, role_password)
\gexec

GRANT :"auth_user", :"books_user", :"orders_user" TO CURRENT_USER;
