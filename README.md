# 童裝訂單系統 (Kidswear B2B Platform)

> B2B 童裝訂單平台，以 **三層 AI 推薦系統**為核心亮點。
> 解決童裝批發商與零售商之間下單效率低落的問題。

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20NestJS%20%7C%20FastAPI-blue)]()
[![Database](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20pgvector-336791)]()
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED)]()

---

## ✨ 核心特色

### 🎯 B2B 訂單平台
- 批發商開設專屬商城、管理商品變體（SKU）與訂單
- 零售商線上瀏覽商城、加入購物車、結帳下單、追蹤出貨
- 訂單狀態機（pending → paid → processing → shipped → completed）含完整稽核

### 🤖 三層 AI 推薦系統
1. **SVD 矩陣分解** — 從訂單歷史學習偏好，個人化推薦；冷啟動自動降級為熱門商品
2. **CLIP 視覺搜尋** — 以文字或圖片跨商城搜尋相似商品（ViT-B/32，512 維向量 + pgvector HNSW）
3. **Claude LLM** — 自然語言推薦解釋，解決 AI 黑箱問題（規劃中）

### 🔐 身份認證
- 帳密登入（bcrypt + JWT RS256）
- LINE / Google OAuth（規劃中）
- Access Token 15 分鐘 + Refresh Token 30 天（httpOnly Cookie）

### 🐳 容器化部署
- Docker Compose 一鍵啟動所有服務（PostgreSQL、Redis、NestJS、FastAPI、Next.js）
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
- **Passport.js** + **JWT**
- **Redis** (購物車快取)
- **class-validator** (DTO 驗證)

### Recommender (AI 微服務)
- **FastAPI** + **Python 3.11**
- **OpenAI CLIP** ViT-B/32（以圖搜圖 / 以文搜圖）
- **scikit-surprise** SVD（協同過濾）
- **SQLAlchemy** + **pgvector**（向量搜尋）
- **Anthropic Claude** Haiku（推薦解釋，規劃中）

### Database & Infra
- **PostgreSQL 16** + **pgvector**（向量索引 HNSW）
- **Redis 7**（購物車、快取）
- **Docker** + **Docker Compose**

---

## 🚀 快速開始

### 前置需求

- Docker Desktop 或 OrbStack
- Node.js 20+ 與 pnpm
- Python 3.11+（本機執行 recommender 時）

### 一鍵啟動（Docker）

```bash
# 1. Clone 專案
git clone https://github.com/justin0322/kidSwear.git
cd kidSwear

# 2. 複製環境變數
cp .env.example .env
# 編輯 .env，填入必要設定

# 3. 啟動所有服務
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

# Recommender (port 8000)
cd recommender && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 📐 系統架構

```
Browser
  └── Next.js (3000)
        └── NestJS API (4000)
              ├── PostgreSQL (5432) + pgvector
              ├── Redis (6379)
              └── FastAPI Recommender (8000)
                    └── PostgreSQL (共用)
```

### 頁面總覽

| 角色 | 路由 | 功能 |
|------|------|------|
| 公開 | `/` | 首頁 |
| 公開 | `/shops` | 商城列表 |
| 公開 | `/shops/:slug` | 單一商城與商品 |
| 公開 | `/products/:id` | 商品詳情、加入購物車 |
| 零售商 | `/retailer/home` | 個人化推薦首頁 |
| 零售商 | `/retailer/search` | 以文 / 以圖搜尋商品 |
| 零售商 | `/retailer/cart` | 購物車 |
| 零售商 | `/retailer/checkout` | 結帳 |
| 零售商 | `/retailer/orders` | 訂單列表 |
| 零售商 | `/retailer/orders/:id` | 訂單詳情與追蹤 |
| 零售商 | `/retailer/profile` | 個人資料 |
| 批發商 | `/wholesaler/dashboard` | 儀表板（今日訂單 / 月營收 / 商品數） |
| 批發商 | `/wholesaler/products` | 商品管理 |
| 批發商 | `/wholesaler/products/new` | 新增商品 |
| 批發商 | `/wholesaler/products/:id/edit` | 編輯商品 |
| 批發商 | `/wholesaler/orders` | 訂單管理 |
| 批發商 | `/wholesaler/orders/:id` | 訂單處理與狀態變更 |
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

# 覆蓋率
cd backend && pnpm test:cov
```

---

## 🛣️ 開發進度

### ✅ 已完成
- 基礎設施（Docker、PostgreSQL + pgvector、Redis）
- 身份認證（JWT + 帳密登入、Refresh Token）
- 商品 CRUD（含 SKU 變體、標籤、圖片）
- 訂單流程（購物車 → 結帳 → 狀態機）
- 批發商：儀表板真實統計、商品管理、訂單管理、商城設定、標籤管理
- 零售商：首頁推薦、購物車、結帳、訂單追蹤、個人資料
- **AI 推薦：SVD 協同過濾**（個人化推薦，冷啟動降級）
- **AI 搜尋：CLIP 視覺搜尋**（以文搜圖、以圖搜圖）
- 全域 Navbar（角色自適應、購物車徽章）

### 🔄 進行中 / 規劃中
- Claude LLM 推薦解釋
- 批發商數據分析頁（熱銷商品、零售商偏好）
- LINE / Google OAuth 登入
- 新用戶 Onboarding 流程
- 商品圖片上傳（目前為 URL 輸入）

### 📋 未來版本
- 金流整合（綠界 / 藍新）
- 物流整合（黑貓 / 新竹）
- 電子發票
- 管理員後台

---

## 🎯 專案亮點

**AI 架構深度**：三層推薦系統從傳統 ML（SVD）到深度學習（CLIP）到 LLM，反映業界演進。

**向量搜尋實作**：pgvector + HNSW 索引，512 維 CLIP 向量 cosine 相似度搜尋，支援跨商城以圖搜圖。

**微服務設計**：主業務（NestJS）與 AI 推薦（FastAPI）分離，各自獨立擴展。

**資料庫設計**：表繼承、SKU 變體、歷史快照、訂單狀態機，貼近真實電商業務需求。

---

## 📄 授權

MIT License

---

## 👤 作者

本專案為求職作品集，展示全端 + AI + DevOps 綜合能力。

歡迎透過 [issue](https://github.com/justin0322/kidSwear/issues) 交流討論！
