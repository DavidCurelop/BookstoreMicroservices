BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure schema-owner roles exist when schema.sql runs standalone outside bootstrap.sh.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ms_auth_role') THEN
    CREATE ROLE ms_auth_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ms_books_role') THEN
    CREATE ROLE ms_books_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ms_orders_role') THEN
    CREATE ROLE ms_orders_role NOLOGIN;
  END IF;
END
$$;

GRANT ms_auth_role, ms_books_role, ms_orders_role TO CURRENT_USER;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS books;
CREATE SCHEMA IF NOT EXISTS orders;

ALTER SCHEMA auth OWNER TO ms_auth_role;
ALTER SCHEMA books OWNER TO ms_books_role;
ALTER SCHEMA orders OWNER TO ms_orders_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS books.books (
  book_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(120),
  publisher VARCHAR(180),
  publication_year INTEGER,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE books.books OWNER TO ms_books_role;

CREATE TABLE IF NOT EXISTS auth.customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(120) NOT NULL CHECK (BTRIM(first_name) <> ''),
  last_name VARCHAR(120) NOT NULL CHECK (BTRIM(last_name) <> ''),
  email VARCHAR(320) NOT NULL CHECK (BTRIM(email) <> ''),
  city VARCHAR(120),
  country VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE auth.customers OWNER TO ms_auth_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_active_email_lower
  ON auth.customers (LOWER(BTRIM(email)))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS orders.orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  order_status VARCHAR(40) NOT NULL
    CHECK (order_status IN ('PLACED', 'COMPLETED', 'CANCELLED')),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  order_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE orders.orders OWNER TO ms_orders_role;

CREATE TABLE IF NOT EXISTS orders.order_items (
  order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders.orders(order_id) ON DELETE RESTRICT,
  book_id UUID NOT NULL,
  isbn VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(14, 2)
    GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders.order_items OWNER TO ms_orders_role;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_timestamp ON orders.orders(order_timestamp);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON orders.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_book_id ON orders.order_items(book_id);

DROP TRIGGER IF EXISTS trg_books_set_updated_at ON books.books;
CREATE TRIGGER trg_books_set_updated_at
BEFORE UPDATE ON books.books
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_set_updated_at ON auth.customers;
CREATE TRIGGER trg_customers_set_updated_at
BEFORE UPDATE ON auth.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON orders.orders;
CREATE TRIGGER trg_orders_set_updated_at
BEFORE UPDATE ON orders.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_order_items_set_updated_at ON orders.order_items;
CREATE TRIGGER trg_order_items_set_updated_at
BEFORE UPDATE ON orders.order_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
