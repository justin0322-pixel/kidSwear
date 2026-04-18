# 童裝訂單系統 - 系統規格書

> **文件版本**: v3.0
> **最後更新**: 2026-04-18
> **專案定位**: 求職作品集 / B2B 整合式訂單平台

---

## 目錄

1. [專案概述](#1-專案概述)
2. [技術選型](#2-技術選型)
3. [資料庫設計](#3-資料庫設計)
4. [AI 推薦系統](#4-ai-推薦系統)
5. [Docker 容器化架構](#5-docker-容器化架構)
6. [身份認證與授權](#6-身份認證與授權)
7. [系統架構圖](#7-系統架構圖)

---

## 1. 專案概述

### 1.1 專案背景

童裝產業批發商與零售商之間的下單方式多採取現場查看商品或臉書社團留言進行下單，導致下單成本高、訂單無法有效整合，且批發商無法分析零售商的喜好。

本系統建立整合式訂單平台，提供批發商管理商品與訂單，並透過 AI 技術分析零售商喜好進行商品推薦。

### 1.2 專案目標

- **降低下單成本**: 零售商線上查看並下訂單，不需親自到場
- **有效整合訂單**: 批發商集中管理所有訂單
- **客製化推薦**: 分析零售商喜好，提供相似商品與缺項商品推薦
- **視覺搜尋體驗**: 導入 AI 視覺模型，支援以圖搜圖、以文搜圖
- **降低登入門檻**: 支援 LINE、Google 等第三方登入

### 1.3 目標使用者

| 角色 | 主要功能 |
|------|---------|
| **批發商** | 建立商品、管理標籤、管理訂單、查看銷售需求分析、開設專屬商城 |
| **零售商** | 瀏覽商品、下訂單、接收個人化推薦、以圖搜圖、以文搜圖 |
| **平台管理員** | 管理批發商帳號、審核商城、監控系統運作 |

---

## 2. 技術選型

### 2.1 前端技術

| 類別 | 技術 | 理由 |
|------|------|------|
| 核心框架 | Next.js 14+ | SSR/SSG、圖片優化、App Router |
| 程式語言 | TypeScript | 型別安全 |
| 樣式框架 | Tailwind CSS + shadcn/ui | 快速打造專業 UI |
| 狀態管理 | Zustand + TanStack Query | UI 狀態 + 伺服器狀態分離 |
| 表單驗證 | React Hook Form + Zod | 型別安全驗證 |

### 2.2 後端技術

| 服務 | 技術 | 職責 |
|------|------|------|
| 主要業務服務 | NestJS (Node.js) | 認證、商品、訂單、金流 |
| 推薦微服務 | FastAPI (Python) | SVD、CLIP、協同過濾 |
| 排程任務 | Celery + Redis | 每日批次重算推薦 |
| 身份驗證 | Passport.js + JWT + OAuth | 多策略認證 |

### 2.3 資料庫

| 用途 | 技術 | 說明 |
|------|------|------|
| 主資料庫 | PostgreSQL 16+ | 訂單、商品、使用者 |
| 向量資料庫 | PostgreSQL + pgvector | CLIP 圖像向量（HNSW 索引）|
| 快取層 | Redis 7+ | 購物車、Session、OAuth state |
| 檔案儲存 | Cloudflare R2 | 商品圖片（搭配 CDN）|

### 2.4 容器化與部署

| 項目 | 工具 |
|------|------|
| 容器化 | Docker |
| 服務編排 | Docker Compose |
| 前端部署 | Vercel |
| 後端部署 | Railway / Fly.io |
| CDN | Cloudflare |
| CI/CD | GitHub Actions |
| 監控 | Sentry + Grafana |

---

## 3. 資料庫設計

### 3.1 設計原則

- 第三正規化，搭配 JSONB 處理彈性欄位
- 所有主表支援軟刪除（`deleted_at`）
- 金額用 `DECIMAL`，絕不用 `FLOAT`
- 外鍵加索引、查詢欄位加索引、標籤用 GIN 索引
- 枚舉值用 `CHECK` 約束
- 時間戳統一用 `TIMESTAMPTZ`

### 3.2 資料表清單（15 張）

| 領域 | 資料表 | 說明 |
|------|-------|------|
| 使用者域 | `users`, `wholesalers`, `retailers`, `user_oauth_accounts` | 身份主表 + 子表 + OAuth 綁定 |
| 商城域 | `shops` | 批發商商城 |
| 商品域 | `products`, `product_variants`, `product_images`, `tags`, `product_tags` | 商品 + SKU + 圖片 + 標籤 |
| 訂單域 | `orders`, `order_items`, `order_status_history` | 訂單 + 明細 + 狀態記錄 |
| 行為域 | `user_behaviors`, `recommendations` | 行為日誌 + 推薦快取 |

### 3.3 關鍵設計模式

**表繼承模式**: `users` 主表 + `wholesalers` / `retailers` 子表，避免單表大量 NULL。

**OAuth 帳號綁定**: `user_oauth_accounts` 獨立表，支援一使用者綁多 provider。

**SKU 變體設計**: `products` 和 `product_variants` 分離，每個尺寸色號組合獨立管理庫存。

**歷史快照**: `order_items` 凍結當下商品資訊，不受日後改價影響。

**推薦結果快取**: `recommendations` 表儲存預計算推薦，線上查詢 < 10ms。

完整 SQL 請見 [`database-schema.sql`](./database-schema.sql)

---

## 4. AI 推薦系統

### 4.1 架構

採用「**離線訓練 + 線上服務**」分離架構：
- 所有 AI 運算離線完成
- 線上只讀預計算結果
- 響應時間 < 50ms

### 4.2 四大推薦演算法

| 類型 | 技術 | 場景 |
|------|------|------|
| 熱門推薦 | SQL + 時間衰減 | 冷啟動、新使用者 |
| 內容過濾 | 標籤向量 + 餘弦相似度 | 相似推薦 |
| 互補推薦 | 品類分析 + 內容過濾 | 缺項推薦 |
| 協同過濾 | SVD 矩陣分解 | 發現驚喜商品 |

### 4.3 混合推薦策略

依零售商活躍度動態調整權重：

| 使用者類型 | 判斷標準 | 熱門 | 內容 | 協同 |
|-----------|---------|------|------|------|
| 新用戶 | 行為 < 5 筆 | 80% | 20% | 0% |
| 中等活躍 | 5-50 筆 | 30% | 40% | 30% |
| 資深使用者 | > 50 筆 | 20% | 30% | 50% |

**缺失品類加分 50%** — 主動推薦零售商缺少的品類。

### 4.4 三大 AI 技術

**SVD 矩陣分解（傳統 ML）**
- 工具: scikit-surprise
- 參數: `n_factors=50, n_epochs=20`
- 頻率: 每日凌晨 2:00 Celery 重訓

**CLIP 圖像向量（視覺 AI）**
- 模型: ViT-B/32（512 維）
- 儲存: pgvector + HNSW 索引
- 功能: 以圖搜圖、以文搜圖、自動標籤建議

**Claude LLM 推薦解釋（生成式 AI）**
- 模型: claude-haiku-4-5
- 策略: 依推薦類型分流 prompt
- 成本: 批次生成後快取，Demo 量級 < $5/月

---

## 5. Docker 容器化架構

### 5.1 容器清單

| 容器 | Base Image | Port | 職責 |
|------|-----------|------|------|
| frontend | node:20-alpine | 3000 | Next.js |
| backend | node:20-alpine | 4000 | NestJS API |
| recommender | python:3.11-slim | 8000 | FastAPI 推薦 |
| postgres | pgvector/pgvector:pg16 | 5432 | 資料庫（內建 pgvector）|
| redis | redis:7-alpine | 6379 | 快取、佇列 |
| celery_worker | python:3.11-slim | - | 排程執行器 |

### 5.2 Volumes

- `postgres_data` — 資料庫持久化
- `redis_data` — Redis 持久化（AOF 模式）
- `clip_models` — CLIP 模型快取（避免每次重新下載）

### 5.3 分階段導入

- **階段 1**（第一週）: 只容器化資料庫與 Redis，應用本機跑
- **階段 2**（MVP 後）: 全部容器化
- **階段 3**（上線前）: 多階段建構、Alpine、`.dockerignore` 優化

---

## 6. 身份認證與授權

### 6.1 雙軌制登入方案

| 登入方式 | 優先度 | 目標使用者 |
|---------|--------|-----------|
| LINE 登入 | 必做 | 台灣中小童裝店家 |
| Google 登入 | 建議 | 有 Gmail 習慣者 |
| 帳密登入 | 必做 | 不想用第三方者 |

### 6.2 OAuth 2.0 Authorization Code Flow

10 步驟流程（以 LINE 為例）：

1. 使用者點「LINE 登入」
2. 後端產生 `state` 存 session，導向 LINE 授權頁
3. 使用者在 LINE 同意授權
4. LINE 回傳 authorization code 到 callback
5. 後端驗證 `state`（防 CSRF）
6. 用 code 換 `access_token`
7. 用 token 取使用者資料
8. 查詢或建立 user（依 `provider + provider_user_id`）
9. 簽發自家 JWT（access + refresh）
10. 前端儲存 JWT，跳轉首頁

### 6.3 安全機制

- **state 參數防 CSRF**: 一次性隨機字串
- **JWT 雙 Token**: access（15 分鐘）+ refresh（30 天 httpOnly cookie）
- **敏感資料加密**: bcrypt（密碼）、AES-256（OAuth token）、RS256（JWT）
- **Refresh Token 輪替**: 每次換新時作廢舊的

### 6.4 技術堆疊

| 功能 | 技術 |
|------|------|
| 認證框架 | Passport.js |
| JWT | @nestjs/jwt |
| 密碼雜湊 | bcrypt（cost 12）|
| Google 策略 | passport-google-oauth20 |
| LINE 策略 | passport-custom（自訂）|

---

## 7. 系統架構圖

```
┌─────────────────────────────────────────────┐
│         Cloudflare CDN + WAF                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│   Next.js frontend (Container)              │
│   React Server Components + Tailwind        │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼─────────┐
│ NestJS backend │   │ FastAPI recommender │
│ (Container)    │   │ (Container)         │
│ 商品/訂單/認證  │   │ SVD/CLIP/協同過濾   │
└───────┬────────┘   └────────┬─────────┘
        │                     │
        └──────────┬──────────┤
                   │          │
           ┌───────┘          └────────┐
           │                           │
┌──────────▼─────────┐    ┌───────────▼──────┐
│ PostgreSQL         │    │ Redis            │
│ + pgvector         │    │ (Container)      │
│ (Container)        │    │ 快取、Session    │
└────────────────────┘    └──────────────────┘

外部服務:
- Cloudflare R2 (商品圖片)
- LINE Login API, Google OAuth API (認證)
- Anthropic API (Claude Haiku)
```

### 運作時序

**商品上架階段（即時）**
1. 批發商上傳商品圖
2. recommender 呼叫 CLIP 萃取向量
3. 寫入 postgres 的 `image_embedding`
4. HNSW 索引自動更新

**每日批次階段（凌晨 2:00）**
1. celery_worker 觸發排程
2. 重訓 SVD 模型
3. 產生 Top 30 推薦
4. 批次生成 LLM 解釋
5. 寫入 `recommendations` 表

**零售商查詢階段（即時）**
1. frontend 請求 `/api/recommendations`
2. backend 查 redis，未命中查 postgres
3. 回傳商品 + LLM 解釋
4. 響應 < 50ms
