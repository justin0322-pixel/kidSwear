# 童裝批發訂單平台 (Kidswear B2B)

> B2B 童裝電商平台，連結批發商與零售商。  
> 核心亮點：**三層 AI 推薦系統**（SVD 協同過濾 × CLIP 視覺搜尋 × Claude LLM 解釋）

[![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20NestJS%20%7C%20FastAPI-blue)]()
[![DB](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20pgvector-336791)]()
[![Tests](https://img.shields.io/badge/Tests-28%20passing-brightgreen)]()
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF)]()
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED)]()

---

## 目錄

- [功能特色](#功能特色)
- [技術堆疊](#技術堆疊)
- [系統架構](#系統架構)
- [頁面總覽](#頁面總覽)
- [API 端點](#api-端點)
- [資料庫模型](#資料庫模型)
- [快速開始](#快速開始)
- [測試](#測試)
- [開發進度](#開發進度)

---

## 功能特色

### 🎯 B2B 訂單管理

| 批發商 | 零售商 |
|--------|--------|
| 開設商城（名稱、Logo、Banner、最低訂金） | 瀏覽所有商城與商品 |
| 商品 CRUD（SKU 變體、標籤、圖片） | 購物車（跨裝置同步，Redis） |
| 訂單狀態管理（含備註、出貨單號） | 結帳下單（多商城自動分單） |
| 數據分析（30 日營收、熱銷排行） | 訂單追蹤與取消 |
| 標籤管理 CRUD | 個人資料編輯 |

**訂單狀態機**：`pending → paid → processing → shipped → completed`（可分支 `cancelled` / `refunded`）

---

### 🤖 三層 AI 推薦系統

```
零售商首頁請求
    │
    ├─ [有訂單歷史] SVD 矩陣分解 → 個人化推薦商品 ID
    │       └─ explain=true → Claude Haiku 生成自然語言推薦理由
    │
    └─ [冷啟動] 依批次購買量取熱門商品
```

| 層級 | 技術 | 用途 |
|------|------|------|
| 第一層 | scikit-surprise SVD | 從訂單歷史學習零售商偏好，個人化推薦 |
| 第二層 | CLIP ViT-B/32 + pgvector HNSW | 以文字或圖片跨商城找視覺相似商品 |
| 第三層 | Anthropic Claude Haiku | 為推薦商品生成自然語言解釋 |

---

### 🔍 商品全文搜尋（PostgreSQL FTS）

```
輸入關鍵字（debounce 300ms）
    └─ GET /products/search?q=藍色上衣
            ├─ tsvector @@ plainto_tsquery('simple', ...)  ← 詞語比對
            ├─ name ILIKE '%keyword%'                      ← 中文子字串（pg_trgm）
            ├─ ts_rank + similarity() 混合排序             ← 相關度排序
            └─ ts_headline() 標記命中關鍵字                ← 高亮顯示

按「AI 搜尋」
    └─ CLIP 語意搜尋 → 相似度 bar 展示
```

- `setweight(A/B/C)` 為 name / category / description 設定搜尋權重
- GIN 雙索引：`tsvector` 索引 + `gin_trgm_ops` 索引
- 搜尋頁即時 FTS + 按需 AI 語意搜尋，展示兩種搜尋能力

---

### 🔔 事件驅動即時通知

```
下單 / 訂單狀態變更
    │
    ▼  EventEmitter2（全域事件匯流排）
NotificationsListener
    ├── WebSocket（socket.io）→ 瀏覽器即時 Toast
    ├── Email（Nodemailer SMTP）→ 信箱通知
    └── LINE Notify API → LINE 推播（批發商綁定後啟用）
```

- `OrdersService` 只 emit 事件，不直接依賴任何通知服務（完全解耦）
- 前端：socket.io-client + Zustand toast store + Radix UI Toast

---

### ⚠️ 庫存預警系統

```
下單後 / 訂單完成後
    └─ InventoryService.checkVariants()
            └─ available ≤ threshold?
                    └─ emit StockLowEvent（含 1 小時 cooldown 防抖）

@Cron 每小時
    └─ InventoryService.scanAllLowStock()   ← 安全網

StockLowEvent → NotificationsListener
    ├── WebSocket 即時警告（批發商）
    ├── Email 通知
    └── 商品管理表格：低庫存 badge（紅色閃爍）
```

- `lowStockThreshold` 欄位存於 `ProductVariant`（預設 5）
- 雙觸發機制：事件驅動（即時）+ Cron（安全網）
- `@nestjs/schedule` 宣告式排程

---

### 🏷️ AI 標籤建議

批發商上傳商品圖片 → CLIP 向量找 15 個視覺相似商品 → 統計標籤頻率 → 回傳 Top 8 建議標籤，一鍵套用。

---

### ⚙️ 非同步 AI 處理

```
建立/更新商品（含 imageUrls）
    └─ fire-and-forget POST /tasks/embed-product
            └─ Celery Worker
                    └─ 抓主圖 → CLIP encode → 寫入 products.image_embedding

每 6 小時（Celery Beat）
    └─ retrain_svd task → 從最新訂單重建互動矩陣 → 重新 fit SVD
```

---

### 🔐 身份認證

- 帳密登入（bcrypt cost 12 + JWT RS256）
- **LINE OAuth**（Authorization Code Flow，手動實作）
- **Google OAuth**（Authorization Code Flow + id_token 解碼，無 Passport 依賴）
- Access Token 15 分鐘 + Refresh Token 30 天（httpOnly Cookie）
- 新用戶 Onboarding（補填店名、聯絡人、收件地址）
- 已登入帳號可**後綁定 LINE / Google**（token query param → httpOnly cookie 流程）
- OAuth 帳號解除綁定
- **修改密碼**（驗證舊密碼後 bcrypt 重新雜湊）

---

### 🛡️ 管理員後台

- 使用者列表（角色篩選、啟用 / 停用）
- 商城列表（啟用 / 停用）
- Role-based guard（`assertAdmin()` 統一保護所有 admin 路由）

---

## 技術堆疊

### Frontend — Next.js 14

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 14 App Router（Server + Client Components） |
| 語言 | TypeScript strict mode |
| 樣式 | Tailwind CSS + shadcn/ui |
| 伺服器狀態 | TanStack Query（useQuery / useMutation） |
| 全域狀態 | Zustand（auth store、toast store） |
| 表單 | React Hook Form + Zod |
| 即時通訊 | socket.io-client |
| 通知 UI | Radix UI Toast |

### Backend — NestJS

| 類別 | 技術 |
|------|------|
| 框架 | NestJS 10 + TypeScript |
| ORM | Prisma 5（PostgreSQL） |
| 認證 | JWT RS256 + LINE / Google OAuth |
| 快取 | Redis 7（ioredis，購物車 Hash） |
| 驗證 | class-validator + class-transformer |
| 文件 | Swagger（自動產生） |
| 即時通訊 | WebSocket（@nestjs/websockets + socket.io） |
| 事件系統 | @nestjs/event-emitter（EventEmitter2） |
| 排程 | @nestjs/schedule（Cron） |
| Email | Nodemailer（SMTP） |
| 全文搜尋 | PostgreSQL tsvector + pg_trgm |

### Recommender — FastAPI

| 類別 | 技術 |
|------|------|
| 框架 | FastAPI + Python 3.11 |
| 協同過濾 | scikit-surprise SVD |
| 視覺搜尋 | CLIP ViT-B/32（openai/clip-vit-base-patch32） |
| 向量資料庫 | pgvector HNSW（cosine 相似度，512 維） |
| LLM | Anthropic Claude Haiku |
| 非同步任務 | Celery + Redis broker |
| 資料庫 | SQLAlchemy + psycopg2 |

### Infrastructure

| 元件 | 版本 |
|------|------|
| PostgreSQL + pgvector | 16 |
| Redis | 7 |
| Docker Compose | — |
| GitHub Actions CI | unit tests + E2E + type-check |

---

## 系統架構

```
Browser
  └── Next.js (3000)
        ├── HTTP  → NestJS API (4000)
        │             ├── PostgreSQL (5432)  ← pgvector HNSW + FTS GIN index
        │             ├── Redis (6379)       ← 購物車 Hash + Celery broker
        │             └── FastAPI (8000)     ← AI 推薦代理
        │
        └── WebSocket /notifications → NestJS (4000)
                └── socket.io rooms (user:{id})  ← 即時通知

FastAPI (8000)
  ├── PostgreSQL（共用）
  ├── Celery Worker  ← CLIP embedding（非同步）
  └── Celery Beat    ← SVD 重訓（每 6 小時）
```

### 事件流架構

```
OrdersService / InventoryService
    │  emit(event)
    ▼
EventEmitter2（NestJS global event bus）
    │  @OnEvent()
    ▼
NotificationsListener
    ├── NotificationsService  → WebSocket (socket.io)
    ├── EmailService          → Nodemailer SMTP
    └── LineNotifyService     → LINE Notify API
```

### Docker Compose Services

| Service | 說明 |
|---------|------|
| `postgres` | PostgreSQL 16 + pgvector |
| `redis` | Redis 7（購物車 + Celery broker） |
| `backend` | NestJS API（port 4000） |
| `frontend` | Next.js（port 3000） |
| `recommender` | FastAPI（port 8000） |
| `celery_worker` | CLIP embedding 非同步處理 |
| `celery_beat` | SVD 定期重訓排程 |

---

## 頁面總覽

### 公開頁面

| 路由 | 說明 |
|------|------|
| `/` | 平台首頁（熱門商城 + 特色介紹） |
| `/login` | 登入（LINE / Google OAuth + 帳密） |
| `/register` | 註冊（角色選擇） |
| `/shops` | 商城列表（分頁、即時搜尋） |
| `/shops/:slug` | 商城詳情（商品列表、篩選） |
| `/products/:id` | 商品詳情（規格選擇、相似商品推薦） |

### 零售商

| 路由 | 說明 |
|------|------|
| `/retailer/home` | 首頁（AI 個人化推薦 + LLM 解釋 + 最近瀏覽） |
| `/retailer/search` | 搜尋（即時 FTS + AI 語意 + 以圖搜圖） |
| `/retailer/cart` | 購物車（調整數量、刪除） |
| `/retailer/checkout` | 結帳（多商城自動分單，自動帶入個人資料） |
| `/retailer/orders` | 訂單列表（狀態篩選） |
| `/retailer/orders/:id` | 訂單詳情（狀態時間軸、取消） |
| `/retailer/orders/:id/success` | 下單成功頁（含付款指引） |
| `/retailer/profile` | 個人資料 + OAuth 綁定 + 修改密碼 |
| `/retailer/onboarding` | 新用戶引導（補填店名、電話、地址） |

### 批發商

| 路由 | 說明 |
|------|------|
| `/wholesaler/dashboard` | 儀表板（今日訂單、月營收、商品數） |
| `/wholesaler/products` | 商品管理列表（狀態 / 分類篩選、低庫存 badge） |
| `/wholesaler/products/new` | 新增商品（含 AI 標籤建議） |
| `/wholesaler/products/:id/edit` | 編輯商品（含 variant 庫存調整） |
| `/wholesaler/orders` | 訂單管理（狀態篩選 + 關鍵字搜尋） |
| `/wholesaler/orders/:id` | 訂單處理（更新狀態、物流單號、備註） |
| `/wholesaler/analytics` | 數據分析（營收趨勢、熱銷排行、活躍零售商） |
| `/wholesaler/shop` | 商城設定（Logo、Banner、最低訂金） |
| `/wholesaler/tags` | 標籤管理 CRUD |
| `/wholesaler/profile` | 帳號設定（修改密碼） |

### 管理員

| 路由 | 說明 |
|------|------|
| `/admin/dashboard` | 系統總覽（使用者數、訂單數、營收、商城數） |
| `/admin/users` | 使用者管理（角色篩選、啟用 / 停用） |
| `/admin/shops` | 商城管理（啟用 / 停用） |

---

## API 端點

Base URL：`/api/v1`

### Auth `/auth`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| POST | `/register` | 帳密註冊 | — |
| POST | `/login` | 帳密登入 | — |
| POST | `/refresh` | 刷新 Access Token | Cookie |
| POST | `/logout` | 登出 | JWT |
| GET | `/me` | 取得當前使用者 | JWT |
| GET | `/line` | LINE OAuth 授權跳轉 | — |
| GET | `/line/callback` | LINE OAuth 回呼 | — |
| GET | `/line/bind` | LINE 帳號綁定起始 | — |
| GET | `/google` | Google OAuth 授權跳轉 | — |
| GET | `/google/callback` | Google OAuth 回呼 | — |
| GET | `/google/bind` | Google 帳號綁定起始 | — |
| GET | `/oauth-accounts` | 已綁定 OAuth 清單 | JWT |
| DELETE | `/oauth-accounts/:provider` | 解除 OAuth 綁定 | JWT |
| PUT | `/profile` | 更新零售商資料 | JWT |
| PUT | `/password` | 修改密碼 | JWT |

### Products `/products`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| GET | `/search` | 全文搜尋（pg_trgm + tsvector） | — |
| GET | `/` | 列出商品（分頁、篩選） | — |
| GET | `/:id` | 商品詳情 | — |
| POST | `/` | 建立商品（批發商） | JWT |
| PUT | `/:id` | 更新商品（批發商） | JWT |
| DELETE | `/:id` | 軟刪除（批發商） | JWT |

### Orders `/orders`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| POST | `/` | 建立訂單（零售商） | JWT |
| GET | `/` | 訂單列表（角色分流、分頁） | JWT |
| GET | `/:id` | 訂單詳情 | JWT |
| PATCH | `/:id/status` | 更新狀態（批發商） | JWT |
| POST | `/:id/cancel` | 取消訂單（零售商） | JWT |

### Cart `/cart`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| GET | `/` | 取得購物車 | JWT |
| POST | `/items` | 加入購物車 | JWT |
| PUT | `/items/:variantId` | 更新數量 | JWT |
| DELETE | `/items/:variantId` | 移除項目 | JWT |
| DELETE | `/` | 清空購物車 | JWT |

### Shops `/shops`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| GET | `/` | 商城列表（分頁） | — |
| GET | `/my` | 自己的商城 | JWT |
| GET | `/my/stats` | 商城統計（今日 / 月） | JWT |
| GET | `/my/analytics` | 30 日分析數據 | JWT |
| PUT | `/my` | 更新商城資訊 | JWT |
| GET | `/:id` | 商城詳情 | — |
| GET | `/:id/tags` | 商城標籤列表 | — |

### Recommendations `/recommendations`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| GET | `/for-you` | 個人化推薦（SVD + LLM） | JWT |
| GET | `/similar` | 相似商品（CLIP） | — |
| POST | `/search/text` | 文字語意搜尋（CLIP） | — |
| POST | `/search/image` | 以圖搜圖（CLIP） | — |
| POST | `/tags/suggest` | AI 標籤建議（批發商） | JWT |

### Admin `/admin`

| 方法 | 路由 | 說明 | 認證 |
|------|------|------|------|
| GET | `/stats` | 系統統計（用戶、訂單、商城、營收） | JWT + Admin |
| GET | `/users` | 使用者列表（分頁、角色篩選） | JWT + Admin |
| PATCH | `/users/:id/status` | 啟用 / 停用使用者 | JWT + Admin |
| GET | `/shops` | 商城列表（分頁） | JWT + Admin |
| PATCH | `/shops/:id/status` | 啟用 / 停用商城 | JWT + Admin |

---

## 資料庫模型

```
User ──┬── Wholesaler ── Shop ──┬── Product ──┬── ProductVariant (lowStockThreshold)
       │                        │              ├── ProductImage
       │                        │              └── ProductTag ── Tag
       │                        └── Order ─────── OrderItem
       │                              └── OrderStatusHistory
       ├── Retailer ─────────────────── Order
       └── UserOauthAccount
```

**Enums**：`UserRole` / `ProductStatus` / `OrderStatus` / `ProductGender` / `BehaviorAction`

**pgvector**：`products.image_embedding vector(512)`，HNSW cosine 索引

**FTS**：`products.search_vector tsvector`，GIN 索引 + `name` gin_trgm_ops 索引，auto-update trigger

---

## 快速開始

### 前置需求

- Docker Desktop（或 OrbStack）
- Node.js 20+ + pnpm
- Python 3.11+（本機開發 recommender 用）

### 環境變數

```bash
cp .env.example .env
```

| 變數 | 說明 | 必填 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | ✅ |
| `REDIS_URL` | Redis 連線字串 | ✅ |
| `JWT_ACCESS_SECRET` | RS256 私鑰 | ✅ |
| `JWT_REFRESH_SECRET` | Refresh Token 私鑰 | ✅ |
| `LINE_CHANNEL_ID` | LINE Login Channel ID | OAuth 用 |
| `LINE_CHANNEL_SECRET` | LINE Login Channel Secret | OAuth 用 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | OAuth 用 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | OAuth 用 |
| `GOOGLE_REDIRECT_URI` | Google OAuth 回呼 URL | OAuth 用 |
| `LINE_NOTIFY_CLIENT_ID` | LINE Notify Client ID | 推播用 |
| `LINE_NOTIFY_CLIENT_SECRET` | LINE Notify Client Secret | 推播用 |
| `LINE_NOTIFY_REDIRECT_URI` | LINE Notify 回呼 URL | 推播用 |
| `SMTP_HOST` | SMTP 伺服器位址 | Email 用 |
| `SMTP_USER` | SMTP 帳號 | Email 用 |
| `SMTP_PASS` | SMTP 密碼 | Email 用 |
| `ANTHROPIC_API_KEY` | Claude API 金鑰（LLM 解釋） | 選填 |

### 一鍵啟動（Docker）

```bash
git clone https://github.com/justin0322/kidSwear.git
cd kidSwear

cp .env.example .env
# 編輯 .env 填入必要設定

docker compose up -d

# 初始化資料庫
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

open http://localhost:3000
```

### 本機開發

```bash
# 只啟動基礎設施
docker compose up -d postgres redis

# Frontend（port 3000）
cd frontend && pnpm install && pnpm dev

# Backend（port 4000）
cd backend && pnpm install && pnpm start:dev

# Recommender API（port 8000）
cd recommender
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Celery Worker（另開終端機）
celery -A app.tasks.celery_app worker --loglevel=info

# Celery Beat（另開終端機，選用）
celery -A app.tasks.celery_app beat --loglevel=info
```

---

## 測試

```bash
cd backend

# 執行所有單元測試
pnpm test

# 覆蓋率報告
pnpm test:cov

# E2E 測試
pnpm test:e2e
```

### 目前覆蓋範圍

| 測試套件 | 測試數 | 覆蓋重點 |
|---------|--------|---------|
| `ProductsService` | 12 | findAll（3）、findById（3）、create（2）、update（2）、remove（2） |
| `OrdersService` | 16 | 建立訂單（6 種錯誤）、狀態機轉換、取消與庫存釋放 |
| `CartService` | 12 | getCart、addItem 累加、updateItem、removeItem、clearCart |
| E2E（supertest） | 12 | health、auth register/login、shops list、products list |
| FastAPI（pytest） | 5 | health、embed_product success/422/500/invalid type |
| **合計** | **57** | **全數通過** |

**CI**：GitHub Actions 在每次 push 自動執行 backend 單元 + E2E 測試、frontend type-check、FastAPI pytest。

---

## 開發進度

### ✅ 已完成

**基礎設施**
- Docker Compose（7 個 service）
- PostgreSQL 16 + pgvector HNSW 向量索引
- Redis 7（購物車 Hash + Celery broker）
- GitHub Actions CI（unit / E2E / type-check / pytest）

**認證**
- 帳密登入 / 註冊（bcrypt + JWT RS256）
- LINE OAuth（Authorization Code Flow）
- Google OAuth（Authorization Code Flow + id_token 解碼）
- 新用戶 Onboarding 流程
- 已登入後綁定 / 解除 OAuth 帳號
- 修改密碼（驗證舊密碼 → bcrypt 重雜湊）

**批發商**
- 商品 CRUD（SKU 變體、標籤、圖片 URL）
- 商品篩選（狀態 / 分類篩選）
- 訂單管理（完整狀態機 + 關鍵字搜尋）
- 儀表板統計（今日訂單、月營收、商品數）
- 數據分析（30 日趨勢、Top 5 商品 / 零售商、狀態分布）
- 商城設定（Logo、Banner、最低訂金）
- 標籤管理 CRUD
- 帳號設定（修改密碼）

**零售商**
- AI 個人化推薦首頁（SVD + LLM 解釋 + 最近瀏覽）
- 商品搜尋（即時 FTS + AI 語意 + 以圖搜圖）
- 購物車（Redis Hash，跨裝置同步）
- 多商城結帳（自動帶入個人資料、自動分單）
- 下單成功頁（含付款指引）
- 訂單列表 / 詳情 / 追蹤 / 取消
- 個人資料編輯（含電話、OAuth 綁定、修改密碼）

**AI**
- SVD 協同過濾（冷啟動自動降級）
- CLIP 視覺搜尋（文字 + 圖片）
- Claude Haiku LLM 推薦解釋
- AI 標籤建議（圖片 → CLIP → 頻率統計）
- Celery 非同步 embedding（商品建立後自動觸發）
- Celery Beat SVD 定期重訓（每 6 小時）

**通知系統**
- WebSocket 即時通知（socket.io，JWT 認證，per-user room）
- 事件驅動架構（EventEmitter2 解耦 OrdersService 與通知邏輯）
- Email 通知（Nodemailer，未設定時優雅停用）
- LINE Notify 推播（OAuth 綁定流程 + token 存 DB）

**搜尋**
- PostgreSQL 全文搜尋（tsvector + GIN 索引 + auto-update trigger）
- pg_trgm 中文子字串 fuzzy 搜尋
- ts_rank + similarity 混合相關度排序
- ts_headline 關鍵字高亮

**庫存管理**
- 低庫存閾值（`lowStockThreshold`，per-variant 設定）
- 事件驅動庫存檢查（下單 / 完成訂單後觸發）
- @Cron 每小時全掃安全網
- 1 小時 cooldown 防抖
- WebSocket + Email 庫存預警通知
- 商品管理表格低庫存 badge

**管理員後台**
- 系統總覽儀表板（9 個 KPI 並行查詢）
- 使用者管理（列表、啟用 / 停用）
- 商城管理（列表、啟用 / 停用）
- Role-based guard

**測試**
- ProductsService 單元測試（12 tests）
- OrdersService 單元測試（16 tests）
- CartService 單元測試（12 tests）
- E2E 測試 12 cases（supertest）
- FastAPI pytest 5 cases

### 📋 未來版本

- 金流整合（綠界 / 藍新）
- 物流整合（黑貓 / 新竹物流）
- 電子發票
- CSV 訂單匯出
- 訂單分析 Dashboard（Recharts 圖表）

---

## 專案亮點

**AI 架構深度**  
三層推薦系統從傳統 ML（SVD）→ 深度學習（CLIP）→ LLM（Claude），完整呈現業界推薦系統演進路徑。

**事件驅動設計**  
`OrdersService` 透過 `EventEmitter2` emit 事件，`NotificationsListener` 訂閱並分發 WebSocket / Email / LINE Notify，服務間完全解耦，新增通知管道無需改動業務邏輯。

**多層次搜尋**  
即時 FTS（pg_trgm + tsvector，毫秒級）→ AI 語意搜尋（CLIP，跨商城語意比對）→ 以圖搜圖，三種搜尋能力層層遞進。

**向量搜尋實作**  
pgvector HNSW 索引 + 512 維 CLIP 向量，cosine 相似度搜尋，支援跨商城以圖搜圖與 AI 標籤建議。

**非同步 AI 架構**  
Celery Worker 處理耗時的 CLIP embedding，不阻塞商品建立 API；Celery Beat 自動定期重訓 SVD，確保推薦模型跟上最新訂單資料。

**可觀測的庫存系統**  
雙觸發庫存預警（事件驅動 + Cron 安全網）+ cooldown 防抖 + 多通道通知，貼近真實電商維運需求。

**微服務分離**  
NestJS 主業務 ↔ FastAPI AI 推薦，純 HTTP proxy，各自獨立擴展。

---

## 文件索引

| 文件 | 內容 |
|------|------|
| [SPEC.md](./docs/SPEC.md) | 完整系統規格 |
| [api-spec.md](./docs/api-spec.md) | RESTful API 端點定義 |
| [user-flows.md](./docs/user-flows.md) | 頁面清單與操作流程 |
| [database-schema.sql](./docs/database-schema.sql) | SQL 建表語法 |
| [CLAUDE.md](./CLAUDE.md) | AI 協作開發規範 |

---

## 授權

MIT License

---

## 作者

本專案為求職作品集，展示全端 + AI + DevOps 綜合能力。  
歡迎透過 [issue](https://github.com/justin0322/kidSwear/issues) 交流討論。
