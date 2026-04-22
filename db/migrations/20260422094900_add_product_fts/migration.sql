-- Enable pg_trgm for fuzzy / Chinese substring matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column
ALTER TABLE "products" ADD COLUMN "search_vector" tsvector;

-- GIN index for full-text search queries
CREATE INDEX "products_search_vector_idx" ON "products" USING GIN ("search_vector");

-- GIN trigram index on name for ILIKE / Chinese character matching
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);

-- Function: rebuild search_vector from name (A), category (B), description (C)
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-maintain search_vector on every insert / update
DROP TRIGGER IF EXISTS products_search_trigger ON "products";
CREATE TRIGGER products_search_trigger
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION products_search_update();

-- Backfill existing rows
UPDATE "products" SET name = name WHERE deleted_at IS NULL;
