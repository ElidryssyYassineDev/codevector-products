-- Products table
CREATE TABLE IF NOT EXISTS products (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT            NOT NULL,
  category    TEXT            NOT NULL,
  price       NUMERIC(10, 2)  NOT NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index for pagination without category filter
CREATE INDEX IF NOT EXISTS idx_products_pagination
ON products (created_at DESC, id DESC);

-- Index for pagination with category filter
CREATE INDEX IF NOT EXISTS idx_products_category_pagination
ON products (category, created_at DESC, id DESC);