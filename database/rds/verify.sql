-- ============================================================
-- File: verify.sql
-- Purpose:
--   Verify isolated schemas, table ownership, snapshot columns,
--   absence of cross-schema foreign keys, and least-privilege
--   grants for BookStore Co.
--
-- Required psql variables:
--   auth_user
--   books_user
--   orders_user
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
\echo '2. Isolated domain tables and ownership'
SELECT schemaname AS schema_name,
       tablename AS table_name,
       tableowner AS owner_role
FROM pg_tables
WHERE (schemaname, tablename) IN (
  ('auth', 'customers'),
  ('books', 'books'),
  ('orders', 'orders'),
  ('orders', 'order_items')
)
ORDER BY schemaname, tablename;

SELECT COUNT(*) = 4 AS required_tables_ok,
       COALESCE(BOOL_AND(
         (schemaname = 'auth' AND tableowner = :'auth_user')
         OR (schemaname = 'books' AND tableowner = :'books_user')
         OR (schemaname = 'orders' AND tableowner = :'orders_user')
       ), false) AS table_ownership_ok
FROM pg_tables
WHERE (schemaname, tablename) IN (
  ('auth', 'customers'),
  ('books', 'books'),
  ('orders', 'orders'),
  ('orders', 'order_items')
)
\gset
\if :required_tables_ok
\else
  \echo 'ERROR: one or more required isolated tables are missing.'
  \quit 1
\endif
\if :table_ownership_ok
\else
  \echo 'ERROR: one or more isolated tables have unexpected ownership.'
  \quit 1
\endif

\echo ''
\echo '3. Snapshot columns and cross-schema foreign key isolation'
SELECT COUNT(*) = 3 AS snapshot_columns_ok
FROM information_schema.columns
WHERE table_schema = 'orders'
  AND table_name = 'order_items'
  AND column_name IN ('isbn', 'title', 'author')
\gset
\if :snapshot_columns_ok
\else
  \echo 'ERROR: orders.order_items is missing snapshot columns (isbn, title, author).'
  \quit 1
\endif

SELECT COUNT(*) = 0 AS no_cross_schema_fks_ok
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
JOIN pg_namespace rel_ns ON rel_ns.oid = rel.relnamespace
JOIN pg_class frel ON frel.oid = c.confrelid
JOIN pg_namespace frel_ns ON frel_ns.oid = frel.relnamespace
WHERE c.contype = 'f'
  AND rel_ns.nspname IN ('auth', 'books', 'orders')
  AND frel_ns.nspname <> rel_ns.nspname
\gset
\if :no_cross_schema_fks_ok
\else
  \echo 'ERROR: cross-schema foreign keys were found.'
  \quit 1
\endif

\echo ''
\echo '4. Minimal seed row counts'
SELECT 'books.books' AS entity, COUNT(*) AS row_count FROM books.books
UNION ALL
SELECT 'auth.customers', COUNT(*) FROM auth.customers
UNION ALL
SELECT 'orders.orders', COUNT(*) FROM orders.orders
UNION ALL
SELECT 'orders.order_items', COUNT(*) FROM orders.order_items
ORDER BY entity;

\echo ''
\echo '5. Runtime roles'
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles
WHERE rolname IN (:'auth_user', :'books_user', :'orders_user', :'app_user', :'ingest_user')
ORDER BY rolname;

SELECT COUNT(*) = 5 AS runtime_roles_ok
FROM pg_roles
WHERE rolname IN (:'auth_user', :'books_user', :'orders_user', :'app_user', :'ingest_user')
\gset
\if :runtime_roles_ok
\else
  \echo 'ERROR: one or more required runtime roles are missing.'
  \quit 1
\endif

\echo ''
\echo '6. Operational indexes present in the baseline'
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname IN ('auth', 'books', 'orders')
  AND tablename IN ('books', 'customers', 'orders', 'order_items')
ORDER BY schemaname, tablename, indexname;

\echo ''
\echo '7. updated_at triggers'
SELECT event_object_schema AS schema_name,
       event_object_table AS table_name,
       trigger_name,
       event_manipulation
FROM information_schema.triggers
WHERE trigger_schema IN ('auth', 'books', 'orders')
ORDER BY event_object_schema, event_object_table, trigger_name, event_manipulation;

\echo ''
\echo '8. Runtime table privileges'
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema IN ('auth', 'books', 'orders')
  AND grantee IN (:'auth_user', :'books_user', :'orders_user', :'app_user', :'ingest_user')
ORDER BY grantee, table_schema, table_name, privilege_type;

\echo ''
\echo '9. Least-privilege schema isolation checks'
SELECT
  has_schema_privilege(:'auth_user', 'auth', 'USAGE')
  AND has_table_privilege(:'auth_user', 'auth.customers', 'SELECT')
  AND has_table_privilege(:'auth_user', 'auth.customers', 'INSERT')
  AND has_table_privilege(:'auth_user', 'auth.customers', 'UPDATE')
  AND has_table_privilege(:'auth_user', 'auth.customers', 'DELETE')
  AND NOT has_schema_privilege(:'auth_user', 'books', 'USAGE')
  AND NOT has_schema_privilege(:'auth_user', 'orders', 'USAGE')
  AND NOT has_table_privilege(:'auth_user', 'books.books', 'SELECT, INSERT, UPDATE, DELETE')
  AND NOT has_table_privilege(:'auth_user', 'orders.orders', 'SELECT, INSERT, UPDATE, DELETE')
  AND NOT has_table_privilege(:'auth_user', 'orders.order_items', 'SELECT, INSERT, UPDATE, DELETE')
  AS auth_isolation_ok,

  has_schema_privilege(:'books_user', 'books', 'USAGE')
  AND has_table_privilege(:'books_user', 'books.books', 'SELECT')
  AND has_table_privilege(:'books_user', 'books.books', 'INSERT')
  AND has_table_privilege(:'books_user', 'books.books', 'UPDATE')
  AND has_table_privilege(:'books_user', 'books.books', 'DELETE')
  AND NOT has_schema_privilege(:'books_user', 'auth', 'USAGE')
  AND NOT has_schema_privilege(:'books_user', 'orders', 'USAGE')
  AND NOT has_table_privilege(:'books_user', 'auth.customers', 'SELECT, INSERT, UPDATE, DELETE')
  AND NOT has_table_privilege(:'books_user', 'orders.orders', 'SELECT, INSERT, UPDATE, DELETE')
  AND NOT has_table_privilege(:'books_user', 'orders.order_items', 'SELECT, INSERT, UPDATE, DELETE')
  AS books_isolation_ok,

  has_schema_privilege(:'orders_user', 'orders', 'USAGE')
  AND has_table_privilege(:'orders_user', 'orders.orders', 'SELECT')
  AND has_table_privilege(:'orders_user', 'orders.orders', 'INSERT')
  AND has_table_privilege(:'orders_user', 'orders.orders', 'UPDATE')
  AND has_table_privilege(:'orders_user', 'orders.orders', 'DELETE')
  AND has_table_privilege(:'orders_user', 'orders.order_items', 'SELECT')
  AND has_table_privilege(:'orders_user', 'orders.order_items', 'INSERT')
  AND has_table_privilege(:'orders_user', 'orders.order_items', 'UPDATE')
  AND has_table_privilege(:'orders_user', 'orders.order_items', 'DELETE')
  AND NOT has_schema_privilege(:'orders_user', 'auth', 'USAGE')
  AND NOT has_schema_privilege(:'orders_user', 'books', 'USAGE')
  AND NOT has_table_privilege(:'orders_user', 'auth.customers', 'SELECT, INSERT, UPDATE, DELETE')
  AND NOT has_table_privilege(:'orders_user', 'books.books', 'SELECT, INSERT, UPDATE, DELETE')
  AS orders_isolation_ok,

  (
    SELECT bool_and(
      has_table_privilege(:'app_user', t, 'SELECT')
      AND has_table_privilege(:'app_user', t, 'INSERT')
      AND has_table_privilege(:'app_user', t, 'UPDATE')
      AND has_table_privilege(:'app_user', t, 'DELETE')
    )
    FROM unnest(ARRAY['auth.customers', 'books.books', 'orders.orders', 'orders.order_items']) AS t
  ) AS app_privileges_ok,

  (
    SELECT bool_and(
      has_table_privilege(:'ingest_user', t, 'SELECT')
      AND NOT has_table_privilege(:'ingest_user', t, 'INSERT, UPDATE, DELETE')
    )
    FROM unnest(ARRAY['auth.customers', 'books.books', 'orders.orders', 'orders.order_items']) AS t
  ) AS ingest_privileges_ok
\gset
\if :auth_isolation_ok
\else
  \echo 'ERROR: ms_auth_role schema isolation failed.'
  \quit 1
\endif
\if :books_isolation_ok
\else
  \echo 'ERROR: ms_books_role schema isolation failed.'
  \quit 1
\endif
\if :orders_isolation_ok
\else
  \echo 'ERROR: ms_orders_role schema isolation failed.'
  \quit 1
\endif
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
\echo '10. Intra-schema referential-integrity sanity check'
SELECT COUNT(*) = 0 AS referential_integrity_ok
FROM orders.order_items oi
LEFT JOIN orders.orders o ON o.order_id = oi.order_id
WHERE o.order_id IS NULL
\gset
\if :referential_integrity_ok
\else
  \echo 'ERROR: orphan order_items were found.'
  \quit 1
\endif

\echo ''
\echo 'Verification completed successfully.'
