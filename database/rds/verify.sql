-- ============================================================
-- File: verify.sql
-- Purpose:
--   Verify the technical bootstrap contract without revealing
--   later analytical/data-quality discoveries.
--
-- Required psql variables:
--   app_user
--   ingest_user
-- ============================================================

\set ON_ERROR_STOP on

\echo ''
\echo '============================================================'
\echo ' BookStore Co. - RDS bootstrap verification'
\echo '============================================================'

\echo ''
\echo '1. Database context'
SELECT current_database() AS database_name,
       current_user AS connected_as,
       current_setting('server_version') AS postgres_version;

\echo ''
\echo '2. Required tables'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('books', 'customers', 'orders', 'order_items')
ORDER BY table_name;

SELECT COUNT(*) = 4 AS required_tables_ok
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('books', 'customers', 'orders', 'order_items')
\gset
\if :required_tables_ok
\else
  \echo 'ERROR: one or more required tables are missing.'
  \quit 1
\endif

\echo ''
\echo '3. Minimal seed row counts'
SELECT 'books' AS entity, COUNT(*) AS row_count FROM books
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
ORDER BY entity;

\echo ''
\echo '4. Runtime roles'
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles
WHERE rolname IN (:'app_user', :'ingest_user')
ORDER BY rolname;

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') AS app_role_ok,
       EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ingest_user') AS ingest_role_ok
\gset
\if :app_role_ok
\else
  \echo 'ERROR: application runtime role is missing.'
  \quit 1
\endif
\if :ingest_role_ok
\else
  \echo 'ERROR: ingestion runtime role is missing.'
  \quit 1
\endif

\echo ''
\echo '5. Operational indexes present in the baseline'
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('books', 'customers', 'orders', 'order_items')
ORDER BY tablename, indexname;

\echo ''
\echo '6. updated_at triggers'
SELECT event_object_table AS table_name,
       trigger_name,
       event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name, event_manipulation;

\echo ''
\echo '7. Runtime table privileges'
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN (:'app_user', :'ingest_user')
ORDER BY grantee, table_name, privilege_type;

\echo ''
\echo '8. Least-privilege checks on books'
SELECT
  :'app_user' AS role_name,
  has_table_privilege(:'app_user', 'public.books', 'SELECT') AS can_select,
  has_table_privilege(:'app_user', 'public.books', 'INSERT') AS can_insert,
  has_table_privilege(:'app_user', 'public.books', 'UPDATE') AS can_update,
  has_table_privilege(:'app_user', 'public.books', 'DELETE') AS can_delete
UNION ALL
SELECT
  :'ingest_user',
  has_table_privilege(:'ingest_user', 'public.books', 'SELECT'),
  has_table_privilege(:'ingest_user', 'public.books', 'INSERT'),
  has_table_privilege(:'ingest_user', 'public.books', 'UPDATE'),
  has_table_privilege(:'ingest_user', 'public.books', 'DELETE');

SELECT
  has_table_privilege(:'app_user', 'public.books', 'SELECT')
  AND has_table_privilege(:'app_user', 'public.books', 'INSERT')
  AND has_table_privilege(:'app_user', 'public.books', 'UPDATE')
  AND has_table_privilege(:'app_user', 'public.books', 'DELETE')
  AS app_privileges_ok,
  has_table_privilege(:'ingest_user', 'public.books', 'SELECT')
  AND NOT has_table_privilege(:'ingest_user', 'public.books', 'INSERT')
  AND NOT has_table_privilege(:'ingest_user', 'public.books', 'UPDATE')
  AND NOT has_table_privilege(:'ingest_user', 'public.books', 'DELETE')
  AS ingest_privileges_ok
\gset
\if :app_privileges_ok
\else
  \echo 'ERROR: application role privileges are not as expected.'
  \quit 1
\endif
\if :ingest_privileges_ok
\else
  \echo 'ERROR: ingestion role is not read-only as expected.'
  \quit 1
\endif

\echo ''
\echo '9. Referential-integrity sanity check'
SELECT COUNT(*) = 0 AS referential_integrity_ok
FROM order_items oi
LEFT JOIN orders o ON o.order_id = oi.order_id
LEFT JOIN books b ON b.book_id = oi.book_id
WHERE o.order_id IS NULL OR b.book_id IS NULL
\gset
\if :referential_integrity_ok
\else
  \echo 'ERROR: orphan order_items were found.'
  \quit 1
\endif

\echo ''
\echo 'Verification completed successfully.'
