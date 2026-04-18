-- ============================================================================
-- 童裝訂單系統 - 資料庫 Schema
-- Version: v3.0
-- PostgreSQL 16+ with pgvector extension
-- ============================================================================

-- ---------- 啟用必要 extensions ----------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 使用者域（User Domain）
-- ============================================================================

-- 共用身份表（表繼承模式的父表）
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),  -- OAuth 使用者可為 NULL
  role          VARCHAR(20) NOT NULL CHECK (role IN ('wholesaler', 'retailer', 'admin')),
  status        VARCHAR(20) NOT NULL DEFAULT 'active' 
                CHECK (status IN ('active', 'suspended', 'pending')),
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_users_role_status ON users(role, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- 批發商資料
CREATE TABLE wholesalers (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name   VARCHAR(100) NOT NULL,
  tax_id         VARCHAR(20) UNIQUE,
  contact_person VARCHAR(50) NOT NULL,
  address        TEXT,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 零售商資料
CREATE TABLE retailers (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name      VARCHAR(100) NOT NULL,
  tax_id         VARCHAR(20),
  contact_person VARCHAR(50) NOT NULL,
  shipping_address TEXT NOT NULL,
  
  -- 推薦系統用：偏好標籤統計快取
  preference_tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth 帳號綁定表（支援一使用者綁多個第三方帳號）
CREATE TABLE user_oauth_accounts (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  provider        VARCHAR(20) NOT NULL 
                  CHECK (provider IN ('google', 'line', 'facebook')),
  provider_user_id VARCHAR(255) NOT NULL,
  
  provider_email  VARCHAR(255),
  provider_name   VARCHAR(100),
  provider_avatar TEXT,
  
  -- Token 儲存（需加密後存入）
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_user ON user_oauth_accounts(user_id);
CREATE INDEX idx_oauth_provider ON user_oauth_accounts(provider, provider_user_id);

-- ============================================================================
-- 商城域（Shop Domain）
-- ============================================================================

CREATE TABLE shops (
  id            BIGSERIAL PRIMARY KEY,
  wholesaler_id BIGINT NOT NULL UNIQUE REFERENCES wholesalers(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  banner_url    TEXT,
  
  min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_shops_slug ON shops(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_shops_active ON shops(is_active) WHERE deleted_at IS NULL;

-- ============================================================================
-- 商品域（Product Domain）
-- ============================================================================

CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  shop_id       BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  sku_prefix    VARCHAR(50),
  
  -- 童裝特化欄位
  category      VARCHAR(50) NOT NULL,  -- 上衣、褲子、洋裝、配件
  age_range     VARCHAR(20),           -- "3-6M", "1-3Y"
  gender        VARCHAR(10) CHECK (gender IN ('boy', 'girl', 'unisex')),
  
  -- 價格
  base_price            DECIMAL(10, 2) NOT NULL,
  suggested_retail_price DECIMAL(10, 2),
  
  -- 彈性屬性
  attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- 狀態
  status        VARCHAR(20) NOT NULL DEFAULT 'draft' 
                CHECK (status IN ('draft', 'active', 'sold_out', 'archived')),
  
  -- 統計欄位（推薦用）
  view_count    INTEGER NOT NULL DEFAULT 0,
  order_count   INTEGER NOT NULL DEFAULT 0,
  
  -- CLIP 圖像向量（512 維，ViT-B/32 輸出）
  image_embedding vector(512),
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_products_shop_status ON products(shop_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('simple', name || ' ' || COALESCE(description, '')));

-- CLIP 向量搜尋索引（HNSW 演算法）
CREATE INDEX idx_products_embedding ON products 
  USING hnsw (image_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 商品變體（SKU）
CREATE TABLE product_variants (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  sku          VARCHAR(100) UNIQUE NOT NULL,
  size         VARCHAR(20) NOT NULL,
  color        VARCHAR(30) NOT NULL,
  
  price_override DECIMAL(10, 2),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (product_id, size, color)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_stock ON product_variants(stock) WHERE stock > 0;

-- 商品圖片
CREATE TABLE product_images (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    VARCHAR(200),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_product ON product_images(product_id, sort_order);

-- 標籤主表
CREATE TABLE tags (
  id          BIGSERIAL PRIMARY KEY,
  shop_id     BIGINT REFERENCES shops(id) ON DELETE CASCADE,  -- NULL = 平台公共標籤
  
  name        VARCHAR(50) NOT NULL,
  category    VARCHAR(30),           -- 風格、版型、功能
  color       VARCHAR(7),            -- UI 顯示色 #FFB6C1
  
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (shop_id, name)
);

CREATE INDEX idx_tags_shop ON tags(shop_id);

-- 商品標籤關聯
CREATE TABLE product_tags (
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX idx_product_tags_tag ON product_tags(tag_id);

-- ============================================================================
-- 訂單域（Order Domain）
-- ============================================================================

CREATE TABLE orders (
  id             BIGSERIAL PRIMARY KEY,
  order_number   VARCHAR(30) UNIQUE NOT NULL,  -- ORD-20260418-0001
  
  retailer_id    BIGINT NOT NULL REFERENCES retailers(id),
  shop_id        BIGINT NOT NULL REFERENCES shops(id),
  
  -- 金額
  subtotal       DECIMAL(10, 2) NOT NULL,
  shipping_fee   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount       DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total          DECIMAL(10, 2) NOT NULL,
  
  -- 狀態機
  status         VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'processing', 'shipped', 
    'completed', 'cancelled', 'refunded'
  )),
  
  -- 收件資訊快照
  shipping_address TEXT NOT NULL,
  contact_name   VARCHAR(50) NOT NULL,
  contact_phone  VARCHAR(20) NOT NULL,
  
  -- 備註
  retailer_note  TEXT,
  wholesaler_note TEXT,
  
  -- 時間戳
  paid_at        TIMESTAMPTZ,
  shipped_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_retailer ON orders(retailer_id, created_at DESC);
CREATE INDEX idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- 訂單明細（含歷史快照）
CREATE TABLE order_items (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   BIGINT NOT NULL REFERENCES product_variants(id),
  
  -- 快照欄位
  product_name VARCHAR(200) NOT NULL,
  sku          VARCHAR(100) NOT NULL,
  size         VARCHAR(20) NOT NULL,
  color        VARCHAR(30) NOT NULL,
  unit_price   DECIMAL(10, 2) NOT NULL,
  
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  subtotal     DECIMAL(10, 2) NOT NULL,
  
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);

-- 訂單狀態變更歷史（稽核用）
CREATE TABLE order_status_history (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status   VARCHAR(30) NOT NULL,
  changed_by  BIGINT REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_order ON order_status_history(order_id, created_at DESC);

-- ============================================================================
-- 行為與推薦域（Behavior & Recommendation Domain）
-- ============================================================================

-- 使用者行為日誌
CREATE TABLE user_behaviors (
  id          BIGSERIAL PRIMARY KEY,
  retailer_id BIGINT NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  product_id  BIGINT REFERENCES products(id) ON DELETE SET NULL,
  
  action      VARCHAR(20) NOT NULL CHECK (action IN (
    'view', 'add_to_cart', 'remove_from_cart', 'purchase', 'favorite'
  )),
  
  -- 推薦用權重（view=1, cart=3, purchase=5）
  weight      SMALLINT NOT NULL DEFAULT 1,
  
  -- 額外資訊
  metadata    JSONB,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_behaviors_retailer_time ON user_behaviors(retailer_id, created_at DESC);
CREATE INDEX idx_behaviors_product ON user_behaviors(product_id, action);

-- 推薦結果快取
CREATE TABLE recommendations (
  id           BIGSERIAL PRIMARY KEY,
  retailer_id  BIGINT NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  score        DECIMAL(5, 4) NOT NULL,   -- 0.0000 ~ 1.0000
  reason       VARCHAR(50) NOT NULL,     -- 'similar_style', 'complementary', 'trending', 'svd_collaborative'
  reason_text  TEXT,                     -- LLM 生成的自然語言解釋
  reason_generated_at TIMESTAMPTZ,
  
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (retailer_id, product_id, reason)
);

CREATE INDEX idx_recommendations_retailer 
  ON recommendations(retailer_id, score DESC) 
  WHERE expires_at > NOW();

-- ============================================================================
-- Seed Data Hints (開發用)
-- ============================================================================

-- 測試用標籤（平台公共標籤，shop_id = NULL）
INSERT INTO tags (shop_id, name, category, color) VALUES
  (NULL, '可愛', '風格', '#FFB6C1'),
  (NULL, '卡通', '風格', '#FFD700'),
  (NULL, '寬版', '版型', '#87CEEB'),
  (NULL, '素色', '風格', '#F5F5DC'),
  (NULL, '條紋', '圖案', '#90EE90'),
  (NULL, '蕾絲', '材質', '#DDA0DD'),
  (NULL, '運動風', '風格', '#FF6347'),
  (NULL, '韓系', '風格', '#FFA07A')
ON CONFLICT (shop_id, name) DO NOTHING;

-- ============================================================================
-- 自動更新 updated_at 的 trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 套用到所有有 updated_at 的表
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('CREATE TRIGGER set_updated_at
                       BEFORE UPDATE ON %I
                       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END;
$$;
