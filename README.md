# 童裝訂單系統 (Kidswear B2B Platform)

> B2B 童裝訂單平台，以 **三層 AI 推薦系統**為核心亮點。
> 解決童裝批發商與零售商之間下單效率低落的問題。

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20NestJS%20%7C%20FastAPI-blue)]()
[![Database](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20pgvector-336791)]()
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED)]()

---

## ✨ 核心特色

### 🎯 B2B 訂單平台
- 批發商開設專屬商城、管理商品變體（SKU）、處理訂單出貨
- 零售商線上瀏覽商城、加入購物車、結帳下單、追蹤出貨
- 訂單狀態機（pending → paid → processing → shipped → completed）含完整稽核
- 批發商數據分析（30 日營收趨勢、熱銷商品、零售商排行、訂單狀態分布）

### 🤖 三層 AI 推薦系統
1. **SVD 矩陣分解** — 從訂單歷史學習零售商偏好，個人化推薦；冷啟動自動降級為熱門商品
2. **CLIP 視覺搜尋** — 以文字或圖片跨商城搜尋相似商品（ViT-B/32，512 維向量 + pgvector HNSW）
3. **Claude Haiku LLM** — 為每件推薦商品生成自然語言解釋，解決 AI 黑箱問題

### 🏷️ AI 標籤建議
- 批發商上傳商品圖片時，後端透過 CLIP 找出視覺相似商品，自動統計並建議最相關標籤
- 一鍵套用建議標籤，大幅降低標籤設定成本

### 🔐 身份認證
- 帳密登入（bcrypt cost 12 + JWT RS256）
- **LINE OAuth** Authorization Code Flow（手動實作，不依賴 Passport）
- 新用戶 onboarding 流程（補填店名、聯絡人、收件地址）
- Access Token 15 分鐘 + Refresh Token 30 天（httpOnly Cookie）

### ⚙️ 非同步 AI 處理
- **Celery Worker**：商品圖片上傳後，自動非同步計算 CLIP 向量並寫入資料庫
- Fire-and-forget 設計，不阻塞商品建立 API，最多 3 次 retry

### 🐳 容器化部署
- Docker Compose 一鍵啟動所有服務（PostgreSQL、Redis、NestJS、FastAPI、Next.js、Celery Worker）
- pgvector 官方映像檔，HNSW 向量索引開箱即用

---

## 🏗️ 技術堆疊

### Frontend
- **Next.js 14** (App Router, Server + Client Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** (server state) + **Zustand** (client state)
- **React Hook Form** + **Zod** (form validation)

### Backend (主 API)
- **NestJS** + **TypeScript**
- **Prisma ORM** (PostgreSQL)
- **JWT RS256**（非對稱加密）
- **Redis** (購物車快取、Celery broker)
- **class-validator** (DTO 驗證)

### Recommender (AI 微服務)
- **FastAPI** + **Python 3.11**
- **OpenAI CLIP** ViT-B/32（以圖搜圖 / 以文搜圖 / AI 標籤建議）
- **scikit-surprise** SVD（協同過濾推薦）
- **Anthropic Claude Haiku**（推薦理由自然語言解釋）
- **Celery**（非同步 embedding 計算）
- **SQLAlchemy** + **pgvector**（向量搜尋）

### Database & Infra
- **PostgreSQL 16** + **pgvector**（HNSW 向量索引）
- **Redis 7**（購物車、Celery broker/backend）
- **Docker** + **Docker Compose**

---

## 🚀 快速開始

### 前置需求

- Docker Desktop 或 OrbStack
- Node.js 20+ 與 pnpm
- Python 3.11+（本機執行 recommender 時）

### 環境變數

```bash
cp .env.example .env
```

必填項目：

| 變數 | 說明 |
|------|------|
| `JWT_ACCESS_SECRET` | RS256 Access Token 私鑰 |
| `JWT_REFRESH_SECRET` | Refresh Token 私鑰 |
| `LINE_CHANNEL_ID` | LINE Login Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Login Channel Secret |
| `ANTHROPIC_API_KEY` | Claude API 金鑰（LLM 解釋功能用，可留空） |

### 一鍵啟動（Docker）

```bash
# 1. Clone 專案
git clone https://github.com/justin0322/kidSwear.git
cd kidSwear

# 2. 設定環境變數
cp .env.example .env

# 3. 啟動所有服務（含 Celery Worker）
docker compose up -d

# 4. 初始化資料庫
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# 5. 開啟瀏覽器
open http://localhost:3000
```

### 本機開發

```bash
# 只啟動基礎設施
docker compose up -d postgres redis

# Frontend (port 3000)
cd frontend && pnpm install && pnpm dev

# Backend (port 4000)
cd backend && pnpm install && pnpm start:dev

# Recommender API (port 8000)
cd recommender && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Celery Worker（另開一個終端機）
cd recommender
celery -A app.tasks.celery_app worker --loglevel=info
```

---

## 📐 系統架構

```
Browser
  └── Next.js (3000)
        └── NestJS API (4000)
              ├── PostgreSQL (5432) + pgvector
              ├── Redis (6379) ←── Celery broker
              └── FastAPI Recommender (8000)
                    ├── PostgreSQL (共用)
                    └── Celery Worker
                          └── CLIP Model (GPU/CPU)
```

### AI 推薦流程

```
零售商首頁
  └── GET /recommendations/for-you
        ├── [有歷史訂單] SVD → 取得推薦商品 ID 清單
        │     └── explain=true → Claude Haiku 生成推薦理由
        └── [冷啟動] 依批次購買量取熱門商品

搜尋（文字）
  └── CLIP encode_text → pgvector HNSW 搜尋 → 相似商品

搜尋（圖片）
  └── CLIP encode_image → pgvector HNSW 搜尋 → 相似商品

AI 標籤建議（批發商上傳圖片）
  └── CLIP encode_image → 找 15 個相似商品 → 統計標籤頻率 → 回傳 Top 8

商品 embedding（非同步）
  └── 建立商品 → Celery task → CLIP encode_image → 寫入 image_embedding
```

---

## 📋 頁面總覽

| 角色 | 路由 | 功能 |
|------|------|------|
| 公開 | `/` | 首頁（平台介紹、熱門商城） |
| 公開 | `/shops` | 商城列表 |
| 公開 | `/shops/:slug` | 單一商城與商品列表 |
| 公開 | `/products/:id` | 商品詳情（變體、加入購物車） |
| 零售商 | `/retailer/home` | 個人化推薦首頁（含 LLM 解釋） |
| 零售商 | `/retailer/search` | 以文字 / 圖片搜尋商品 |
| 零售商 | `/retailer/cart` | 購物車 |
| 零售商 | `/retailer/checkout` | 結帳 |
| 零售商 | `/retailer/orders` | 訂單列表 |
| 零售商 | `/retailer/orders/:id` | 訂單詳情與出貨追蹤 |
| 零售商 | `/retailer/profile` | 個人資料編輯 |
| 批發商 | `/wholesaler/dashboard` | 儀表板（今日訂單 / 月營收 / 商品數） |
| 批發商 | `/wholesaler/products` | 商品管理列表 |
| 批發商 | `/wholesaler/products/new` | 新增商品（含 AI 標籤建議） |
| 批發商 | `/wholesaler/products/:id/edit` | 編輯商品 |
| 批發商 | `/wholesaler/orders` | 訂單管理 |
| 批發商 | `/wholesaler/orders/:id` | 訂單處理與狀態變更 |
| 批發商 | `/wholesaler/analytics` | 數據分析（營收趨勢、熱銷排行） |
| 批發商 | `/wholesaler/shop` | 商城設定 |
| 批發商 | `/wholesaler/tags` | 標籤管理 |

---

## 📖 文件索引

| 文件 | 內容 |
|------|------|
| [SPEC.md](./docs/SPEC.md) | 完整系統規格 |
| [API 規範](./docs/api-spec.md) | RESTful API 端點定義 |
| [使用者流程](./docs/user-flows.md) | 頁面清單與操作流程 |
| [資料庫 Schema](./docs/database-schema.sql) | SQL 建表語法 |
| [Claude Code 指引](./CLAUDE.md) | AI 協作開發規範 |

---

## 🧪 測試

```bash
# 後端單元測試
cd backend && pnpm test

# 後端 E2E 測試
cd backend && pnpm test:e2e

# 覆蓋率報告
cd backend && pnpm test:cov
```

---

## 🛣️ 開發進度

### ✅ 已完成

**基礎設施**
- Docker Compose（PostgreSQL + pgvector、Redis、NestJS、FastAPI、Next.js、Celery Worker）

**身份認證**
- 帳密登入 / 註冊（bcrypt + JWT RS256）
- LINE OAuth（Authorization Code Flow，手動實作）
- 新用戶 Onboarding 流程

**批發商功能**
- 商品 CRUD（SKU 變體、標籤、圖片 URL）
- 訂單管理（狀態機：pending → paid → processing → shipped → completed）
- 儀表板真實統計（今日訂單數、月營收、商品數）
- 數據分析（30 日營收趨勢、熱銷商品 Top 5、零售商排行 Top 5）
- 商城設定（名稱、描述、Logo、Banner、最低訂單金額）
- 標籤管理 CRUD

**零售商功能**
- 個人化推薦首頁（AI 推薦 + LLM 解釋）
- 以文字 / 圖片搜尋商品（CLIP 視覺搜尋）
- 購物車（Redis Hash，跨裝置同步）
- 結帳下單
- 訂單列表 / 詳情 / 出貨追蹤
- 個人資料編輯

**AI 功能**
- SVD 協同過濾推薦（冷啟動自動降級）
- CLIP 視覺搜尋（以文搜圖 / 以圖搜圖）
- Claude Haiku LLM 推薦解釋
- AI 標籤建議（上傳圖片 → CLIP 相似度 → 統計標籤頻率）
- Celery 非同步 embedding 計算（商品建立後自動觸發）

### 📋 未來版本
- SVD 模型定期自動重訓（Celery Beat）
- 金流整合（綠界 / 藍新）
- 物流整合（黑貓 / 新竹）
- 電子發票
- 管理員後台

---

## 🎯 專案亮點

**AI 架構深度**：三層推薦系統從傳統 ML（SVD）到深度學習（CLIP）再到 LLM（Claude），完整呈現業界推薦系統演進路徑。

**向量搜尋實作**：pgvector + HNSW 索引，512 維 CLIP 向量 cosine 相似度搜尋，支援跨商城以圖搜圖與 AI 標籤建議。

**微服務設計**：主業務（NestJS）與 AI 推薦（FastAPI + Celery）分離，各自獨立擴展；NestJS → FastAPI 為純 HTTP proxy，不引入 gRPC 等複雜依賴。

**非同步架構**：Celery Worker 處理耗時的 CLIP embedding，fire-and-forget 設計確保商品建立 API 不受 AI 計算影響。

**資料庫設計**：表繼承（Wholesaler / Retailer 繼承 User）、SKU 變體、訂單歷史快照、訂單狀態機，貼近真實電商業務需求。

---

## 📄 授權

MIT License

---

## 👤 作者

本專案為求職作品集，展示全端 + AI + DevOps 綜合能力。

歡迎透過 [issue](https://github.com/justin0322/kidSwear/issues) 交流討論！
