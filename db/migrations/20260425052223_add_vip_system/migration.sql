-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "is_vip_only" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "shop_vip_members" (
    "id" BIGSERIAL NOT NULL,
    "shop_id" BIGINT NOT NULL,
    "retailer_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_vip_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_vip_discounts" (
    "id" BIGSERIAL NOT NULL,
    "variant_id" BIGINT NOT NULL,
    "shop_id" BIGINT NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "variant_vip_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_vip_members_retailer_id_idx" ON "shop_vip_members"("retailer_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_vip_members_shop_id_retailer_id_key" ON "shop_vip_members"("shop_id", "retailer_id");

-- CreateIndex
CREATE INDEX "variant_vip_discounts_shop_id_idx" ON "variant_vip_discounts"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "variant_vip_discounts_variant_id_shop_id_key" ON "variant_vip_discounts"("variant_id", "shop_id");

-- AddForeignKey
ALTER TABLE "shop_vip_members" ADD CONSTRAINT "shop_vip_members_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_vip_members" ADD CONSTRAINT "shop_vip_members_retailer_id_fkey" FOREIGN KEY ("retailer_id") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_vip_discounts" ADD CONSTRAINT "variant_vip_discounts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_vip_discounts" ADD CONSTRAINT "variant_vip_discounts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
