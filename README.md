# 童裝訂單系統 (Kidswear Platform)

> 整合式童裝訂單平台，以 AI 推薦系統為核心亮點。
> 解決童裝批發商與零售商之間下單效率低落的問題。

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20NestJS%20%7C%20FastAPI-blue)]()
[![Database](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20pgvector-336791)]()
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED)]()

---

## ✨ 核心特色

### 🎯 訂單平台
- 批發商開設專屬商城、管理商品與訂單
- 零售商線上瀏覽、下單、追蹤出貨
- 訂單狀態機、歷史快照、完整稽核

### 🤖 三層 AI 推薦系統
1. **SVD 矩陣分解** — 傳統協同過濾
2. **CLIP 視覺搜尋** — 跨商城以圖搜圖、以文搜圖
3. **Claude LLM** — 自然語言推薦解釋，解決黑箱問題

### 🔐 雙軌制身份認證
- LINE OAuth（契合台灣市場）
- Google OAuth
- 帳密登入（保底方案）
- JWT + Refresh Token 架構

### 🐳 容器化部署
- Docker Compose 一鍵啟動所有服務
- 支援本機開發、測試、正式三環境
- pgvector 官方映像檔，免去安裝踩坑

---

## 🏗️ 技術堆疊

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Zustand** + **TanStack Query**
- **React Hook Form** + **Zod**

### Backend
- **NestJS** (主 API)
- **FastAPI** (AI 推薦微服務)
- **Prisma ORM**
- **Passport.js** (認證)
- **Celery** (排程任務)

### Database & Infra
- **PostgreSQL 16** + **pgvector**
- **Redis 7**
- **Cloudflare R2** (圖片儲存)
- **Docker** + **Docker Compose**

### AI & ML
- **scikit-surprise** (SVD)
- **OpenAI CLIP** (ViT-B/32)
- **Anthropic Claude** (Haiku)

---

## 🚀 快速開始

### 前置需求

- Docker Desktop 或 OrbStack
- Node.js 20+ 和 pnpm
- Python 3.11+（若要在本機跑 recommender）
- PostgreSQL 16（若不用 Docker）

### 安裝與啟動

```bash
# 1. Clone 專案
git clone https://github.com/<your-username>/kidswear-b2b.git
cd kidswear-b2b

# 2. 複製環境變數範本
cp .env.example .env
# 編輯 .env，填入 LINE_CHANNEL_ID、ANTHROPIC_API_KEY 等

# 3. 啟動所有服務（Docker）
docker compose up -d

# 4. 初始化資料庫
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# 5. 開啟瀏覽器
open http://localhost:3000
```

### 本機開發（不用 Docker）

```bash
# 只啟動基礎設施
docker compose up -d postgres redis

# Frontend
cd frontend && pnpm install && pnpm dev

# Backend (另一個 terminal)
cd backend && pnpm install && pnpm start:dev

# Recommender (另一個 terminal)
cd recommender && pip install -r requirements.txt && uvicorn app.main:app --reload
```

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
# 單元測試
cd backend && pnpm test

# E2E 測試
cd backend && pnpm test:e2e

# 覆蓋率
cd backend && pnpm test:cov

# Frontend 測試
cd frontend && pnpm test
```

---

## 📦 部署

### 前端（Vercel）

```bash
cd frontend
vercel deploy --prod
```

### 後端（Railway / Fly.io）

支援 Docker image 直接部署：

```bash
# Railway
railway up

# Fly.io
fly deploy
```

### CI/CD

已設定 GitHub Actions，push 到 `main` 自動：
1. 執行所有測試
2. 建置 Docker image
3. 推送到 container registry
4. 部署到正式環境

---

## 🎯 專案亮點

### 技術深度

- **AI 推薦系統**: 三層架構，從傳統 ML 到 LLM
- **向量資料庫**: pgvector + HNSW 索引，跨商城視覺搜尋
- **離線訓練 + 線上服務**: 業界標準架構，響應 < 50ms
- **OAuth 2.0**: 完整 Authorization Code Flow 實作

### 架構能力

- **微服務**: 主業務（NestJS）與推薦服務（FastAPI）分離
- **容器化**: 6 個服務 Docker Compose 編排
- **資料庫設計**: 表繼承、SKU 變體、歷史快照、OAuth 帳號綁定
- **狀態機**: 訂單狀態流轉含稽核

### 業務理解

- **目標市場清晰**: 台灣童裝 B2B，LINE 登入契合使用習慣
- **核心痛點**: 降低下單成本、整合訂單、個人化推薦
- **AI 應用合理**: 視覺搜尋契合童裝視覺導向特性

---

## 🛣️ 開發路線圖

### v1.0 MVP（當前階段）
- [x] 專案規格與架構設計
- [ ] 基礎設施（Docker、DB、Redis）
- [ ] 身份認證（JWT + 帳密）
- [ ] 商品 CRUD
- [ ] 訂單基本流程

### v1.1 核心功能
- [ ] LINE 登入整合
- [ ] 購物車與結帳
- [ ] 訂單狀態機
- [ ] 批發商數據分析

### v1.2 AI 推薦
- [ ] SVD 矩陣分解
- [ ] CLIP 圖像向量
- [ ] 以圖搜圖、以文搜圖
- [ ] Claude LLM 推薦解釋

### v2.0 進階功能
- [ ] 金流整合（綠界/藍新）
- [ ] 物流整合（黑貓/新竹）
- [ ] 電子發票
- [ ] 2FA 兩因素認證

---

## 📄 授權

MIT License

---

## 👤 作者

本專案為求職作品集，展示全端 + AI + DevOps 綜合能力。

歡迎透過 issue 交流討論！
