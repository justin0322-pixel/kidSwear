-- DropIndex
DROP INDEX "products_name_trgm_idx";

-- DropIndex
DROP INDEX "products_search_vector_idx";

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "low_stock_threshold" INTEGER NOT NULL DEFAULT 5;
