# Claude Code 開發指引

> **此檔案供 Claude Code / Cursor / GitHub Copilot 讀取**
> 遇到不確定的決策，優先參考 `docs/` 下的規格文件。
> 請在每個新對話開始時先閱讀此檔案。

---

## 🎯 專案簡介

童裝訂單系統 — B2B 電商平台，連接童裝批發商與零售商。
核心亮點：三層 AI 推薦系統（SVD + CLIP + Claude LLM）。

**完整規格**: `docs/SPEC.md`
**API 定義**: `docs/api-spec.md`
**使用者流程**: `docs/user-flows.md`
**資料庫 SQL**: `docs/database-schema.sql`

---

## 🏗️ 技術堆疊（不可擅自變更）

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma ORM
- **Recommender**: FastAPI + Python 3.11 + scikit-surprise + PyTorch
- **Database**: PostgreSQL 16 + pgvector
- **Cache**: Redis 7
- **Container**: Docker + Docker Compose

---

## 📁 專案結構

```
kidswear-b2b/
├── frontend/              # Next.js 應用
│   ├── app/              # App Router 頁面
│   ├── components/       # React 元件
│   ├── lib/              # utils、API client
│   ├── hooks/            # 自訂 hooks
│   └── stores/           # Zustand stores
├── backend/              # NestJS 主 API
│   ├── src/
│   │   ├── auth/         # 認證模組
│   │   ├── users/        # 使用者模組
│   │   ├── products/     # 商品模組
│   │   ├── orders/       # 訂單模組
│   │   ├── shops/        # 商城模組
│   │   ├── recommendations/  # 推薦 API（代理到 FastAPI）
│   │   ├── common/       # 共用 (guards, filters, interceptors)
│   │   └── prisma/       # Prisma service
│   └── test/             # E2E 測試
├── recommender/          # FastAPI 推薦服務
│   ├── app/
│   │   ├── main.py
│   │   ├── algorithms/   # SVD、CLIP、內容過濾
│   │   ├── tasks/        # Celery tasks
│   │   └── models/       # Pydantic models
│   └── models/           # 訓練好的模型檔
├── db/
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # migration 檔
│   └── seed.ts           # 種子資料
├── docs/                 # 規格文件
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 📏 程式碼風格規範

### 通用規則

- **UTF-8 編碼，LF 換行**
- **禁止 `any` 型別**，必要時要註解理由
- **禁止 `console.log`**（backend 用 NestJS Logger，frontend 用統一 logger）
- **禁止硬編碼金鑰或密碼**（一律用環境變數）
- **禁止跳過 TypeScript 型別檢查**（不要用 `// @ts-ignore`）

### TypeScript 慣例

- **偏好 type alias 而非 interface**（除非需要 extend 或 implements）
- **嚴格模式**: tsconfig 開啟 `strict: true`
- **返回型別明確宣告**：所有公開函式都要明確標註返回型別
- **null vs undefined**: 用 `undefined` 表示「沒有值」，`null` 只在資料庫場景使用

### NestJS（Backend）

- **Controller 薄、Service 厚**，Controller 只負責：
  1. 參數驗證（DTO）
  2. 呼叫 Service
  3. 包裝回應格式
- **DTO 用 `class-validator`**: 每個端點都要有完整的驗證
- **錯誤處理用 `HttpException`**: 不要用 `throw new Error`
- **模組按 domain 切分**，每個模組包含:
  - `*.module.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - `dto/*.dto.ts`
  - `*.spec.ts`（單元測試）
- **ORM 統一用 Prisma**，不要在 Service 寫原生 SQL（推薦服務除外）
- **使用 `@Injectable()` 的 Service 要遵循單一職責原則**

### Next.js（Frontend）

- **優先用 Server Components**，需要互動才加 `"use client"`
- **資料獲取**: Server Component 直接 fetch；Client Component 用 TanStack Query
- **表單**: React Hook Form + Zod schema（資料驗證與型別同一個 source of truth）
- **狀態管理**:
  - 伺服器狀態 → TanStack Query
  - 全域 UI 狀態 → Zustand
  - 區域狀態 → `useState`
- **樣式**: 統一用 Tailwind class，**禁止行內 style**（除非動態值）
- **元件命名**: PascalCase（`ProductCard.tsx`）
- **檔案命名**:
  - 元件檔: PascalCase
  - 其他檔（hook, util, config）: kebab-case
- **避免 prop drilling**: 超過 2 層就用 Context 或 Zustand

### FastAPI（Recommender）

- **用 Pydantic v2** 定義所有 request/response models
- **模型載入用 singleton pattern**（CLIP 模型昂貴）
- **資料庫操作用 SQLAlchemy**
- **Celery tasks 集中在 `tasks/` 資料夾**
- **型別提示完整**: 所有函式參數和返回值都要標註型別

---

## 🗃️ 資料庫規則

### Schema 變更

- **每次改 schema 必須建 migration**: `npx prisma migrate dev --name <description>`
- **永遠不要手動改資料庫**
- **migration 不能修改**（已 apply 過的），要改就建新的 migration

### 查詢規則

- **所有 list 查詢必須分頁**（預設 pageSize=20，最大 100）
- **避免 N+1 查詢**: 用 Prisma 的 `include` 或 `select`
- **軟刪除**: 查詢時加 `where: { deletedAt: null }`（或用 Prisma middleware 自動處理）
- **索引優先**: 任何 `WHERE` 條件欄位都要確認有索引

### 金額處理

- **資料庫儲存**: `Decimal(10, 2)`
- **Prisma 型別**: `Decimal`（來自 `@prisma/client/runtime/library`）
- **API 傳輸**: **字串**（避免 JSON 精度問題）
- **前端顯示**: 用 `Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' })`

---

## 🔐 安全性要求

### 必做

- **密碼**: bcrypt，cost factor 12
- **JWT**: RS256（非對稱），access 15 分鐘，refresh 30 天
- **Refresh token**: httpOnly cookie，SameSite=strict
- **OAuth token**: AES-256 加密後存資料庫
- **SQL injection**: 一律用 ORM 參數化查詢
- **XSS**: 前端不要用 `dangerouslySetInnerHTML`
- **CSRF**: 狀態變更操作檢查 Origin header
- **Rate limiting**: 認證端點 10 req/min，一般 API 300 req/min

### 不做

- 不要把密碼或金鑰寫進 code
- 不要把敏感資料寫進 log
- 不要信任任何使用者輸入（一律驗證）
- 不要用 HTTP 傳輸敏感資料（正式環境強制 HTTPS）

---

## 📝 命名慣例

### API 路由

- **RESTful**: 用複數名詞，`/api/v1/products`
- **小寫、kebab-case**: `/api/v1/user-oauth-accounts`
- **動詞用於動作**: `/auth/login`, `/orders/:id/cancel`

### 變數與函式

- **變數**: `camelCase`（`userId`, `orderTotal`）
- **常數**: `SCREAMING_SNAKE_CASE`（`MAX_ORDER_AMOUNT`）
- **類別、型別**: `PascalCase`（`UserService`, `OrderDto`）
- **檔案**: 依框架慣例（上面 Frontend/Backend 章節）
- **資料庫表**: `snake_case`（`user_oauth_accounts`）
- **資料庫欄位**: `snake_case`（`created_at`）
- **Prisma model**: `PascalCase`（`UserOauthAccount`），會自動轉換

### 環境變數

- 統一 `SCREAMING_SNAKE_CASE`
- 按服務分組: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `LINE_CHANNEL_ID` 等

---

## 🧪 測試要求

### 覆蓋率目標

- **Backend Service 層**: > 80%
- **核心業務邏輯（訂單、金流、推薦）**: > 90%
- **整體**: > 70%

### 測試類型

- **單元測試**（`*.spec.ts`）: 所有 Service method
- **E2E 測試**: 所有 API 端點（至少 happy path）
- **整合測試**: 跨 Service 的業務流程（下單、退款）

### 測試原則

- **一個測試只驗一件事**
- **AAA 結構**: Arrange, Act, Assert
- **Mock 外部依賴**: 資料庫、第三方 API、檔案系統
- **測試資料用 factory**: 不要在 test 檔重複建立同樣的資料

---

## 🚀 開發流程規則

### 新增功能前

1. **先讀相關 docs**: `SPEC.md`, `api-spec.md`, `user-flows.md`
2. **確認 schema**: 若需改資料庫，先看 `database-schema.sql` 和 `prisma/schema.prisma`
3. **列出要改動的檔案清單**（給使用者確認後再動手）

### 撰寫程式碼時

1. **依照 API 規範**: 端點、參數、錯誤碼都要與 `api-spec.md` 一致
2. **先寫測試**（TDD）: 特別是業務邏輯複雜的功能
3. **commit 小而頻繁**: 一個 commit 一件事

### 完成功能後

1. **執行 lint**: `npm run lint`
2. **執行測試**: `npm test`
3. **更新 API 文件**（Swagger 自動產生）
4. **撰寫清楚的 commit message**（見下方）

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>
```

**type**:
- `feat`: 新功能
- `fix`: bug 修復
- `refactor`: 重構
- `test`: 加測試
- `docs`: 文件更新
- `chore`: 雜項

**範例**:
```
feat(orders): 支援批發商更新訂單狀態

- 新增 PATCH /orders/:id/status 端點
- 實作狀態機驗證
- 加入 order_status_history 記錄
```

---

## 🤖 AI 工作指引（給你 — AI 助手）

### 遇到架構性決策

- **先詢問**，不要擅自決定
- 提供 2-3 個方案及優缺點供使用者選擇

### 產生程式碼前

- **先列出要改動的檔案清單**
- **複雜任務先提出計畫**
- **確認使用者同意再動手**

### 修改既有程式碼

- **用 `str_replace` 而非整檔重寫**
- 大型重構分成多個小 commit
- **不要刪除使用者未要求刪除的程式碼**

### 產生 SQL 或 Prisma 時

- **先看 `prisma/schema.prisma` 確認現有結構**
- 禁止硬編碼 ID 或 schema 名稱

### 遇到不確定

- **查文件，不要猜**
- 明確告訴使用者「我不確定這個 API 在 v5 是否存在，讓我查一下」

---

## 🚫 禁止事項（絕對不做）

1. **不要自動執行破壞性指令**（`rm -rf`, `DROP TABLE`, `force push`）
2. **不要提交 `.env` 檔到 git**
3. **不要把 API key 寫在 code 裡**
4. **不要繞過 TypeScript 型別檢查**
5. **不要用 JavaScript 寫新檔案**（全部 TypeScript）
6. **不要在 Controller 寫業務邏輯**
7. **不要用 `any` 型別**
8. **不要用 `console.log`**（除非 debug 用，提交前要清掉）
9. **不要直接改資料庫**（一律走 migration）
10. **不要一次產出 > 5 個檔案**（先分批確認）

---

## 📚 參考文件順序

遇到不確定時，依以下順序參考：

1. `docs/SPEC.md` — 整體規格
2. `docs/api-spec.md` — API 細節
3. `docs/user-flows.md` — 前端頁面與流程
4. `docs/database-schema.sql` — 資料庫結構
5. 此檔案（CLAUDE.md）— 開發規範
6. 外部官方文件（Next.js、NestJS、Prisma、FastAPI 等）

---

## 🔄 此檔案更新規則

當你（AI）或使用者發現新的慣例或規則時：
1. 先確認使用者同意
2. 更新此檔案
3. commit 訊息: `docs(claude): 新增 XXX 開發規則`
