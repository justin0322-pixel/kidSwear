# API 設計規範

> 本文件定義所有 RESTful API 端點、請求/回應格式、錯誤處理規範。
> AI 開發時請嚴格遵守此規範，確保所有 API 風格一致。

---

## 1. 通用規範

### 1.1 Base URL

- Development: `http://localhost:4000/api/v1`
- Production: `https://api.kidswear.example.com/api/v1`

### 1.2 認證

除了註冊、登入端點外，**所有 API 都需要 JWT**。

```http
Authorization: Bearer <access_token>
```

### 1.3 請求格式

- Content-Type: `application/json`
- 字符編碼: UTF-8
- 時間格式: ISO 8601（`2026-04-18T15:30:00Z`）
- 金額: 字串表示的數字（避免 JSON 精度問題）

### 1.4 回應格式

**成功回應**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-18T15:30:00Z",
    "version": "1.0"
  }
}
```

**分頁回應**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 153,
    "totalPages": 8
  }
}
```

**錯誤回應**
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "商品不存在",
    "details": { "productId": 123 }
  }
}
```

### 1.5 HTTP 狀態碼

| Code | 用途 |
|------|------|
| 200 | GET、PUT、DELETE 成功 |
| 201 | POST 建立成功 |
| 204 | 成功但無回應內容 |
| 400 | 請求格式錯誤、驗證失敗 |
| 401 | 未認證 |
| 403 | 已認證但權限不足 |
| 404 | 資源不存在 |
| 409 | 衝突（如 email 已被註冊）|
| 422 | 業務邏輯錯誤（如庫存不足）|
| 429 | Rate limit |
| 500 | 伺服器錯誤 |

### 1.6 錯誤碼清單

| Code | 意義 |
|------|------|
| `VALIDATION_ERROR` | 請求參數驗證失敗 |
| `AUTH_REQUIRED` | 需要登入 |
| `AUTH_INVALID_CREDENTIALS` | 帳密錯誤 |
| `AUTH_TOKEN_EXPIRED` | Token 過期 |
| `PERMISSION_DENIED` | 權限不足 |
| `RESOURCE_NOT_FOUND` | 資源不存在 |
| `DUPLICATE_RESOURCE` | 資源已存在 |
| `INSUFFICIENT_STOCK` | 庫存不足 |
| `INVALID_STATE_TRANSITION` | 狀態轉換不合法 |
| `OAUTH_ERROR` | OAuth 流程錯誤 |
| `RATE_LIMIT_EXCEEDED` | 請求過於頻繁 |

### 1.7 分頁參數

所有 list 類端點支援：

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `page` | int | 1 | 頁碼（從 1 開始）|
| `pageSize` | int | 20 | 每頁筆數（最大 100）|
| `sortBy` | string | `createdAt` | 排序欄位 |
| `sortOrder` | string | `desc` | `asc` 或 `desc` |

### 1.8 Rate Limiting

- 未登入: 60 req/min
- 已登入: 300 req/min
- 認證端點: 10 req/min（防暴力破解）

---

## 2. 身份認證 API

### 2.1 帳密註冊

```
POST /auth/register
```

**Request**
```json
{
  "email": "wholesaler@example.com",
  "password": "SecurePass123!",
  "role": "wholesaler",
  "companyName": "可愛童裝批發",
  "contactPerson": "王小明"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "...", "role": "wholesaler" },
    "accessToken": "eyJ...",
    "refreshToken": "set in httpOnly cookie"
  }
}
```

### 2.2 帳密登入

```
POST /auth/login
```

**Request**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### 2.3 LINE 登入（啟動 OAuth）

```
GET /auth/line/login?role=retailer
```

**說明**: 重導向到 LINE OAuth 頁，`role` 參數會存 session。

### 2.4 LINE OAuth Callback

```
GET /auth/line/callback?code=xxx&state=xxx
```

**說明**: LINE 授權後的 callback，不直接被呼叫。成功後重導回前端並帶 JWT。

### 2.5 Google 登入

```
GET /auth/google/login?role=retailer
GET /auth/google/callback?code=xxx&state=xxx
```

### 2.6 Token 刷新

```
POST /auth/refresh
```

**說明**: Refresh token 從 httpOnly cookie 讀取。

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_token"
  }
}
```

### 2.7 登出

```
POST /auth/logout
```

**說明**: 清除 refresh token cookie，將 access token 加入 blacklist。

### 2.8 取得當前使用者

```
GET /auth/me
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "...",
    "role": "retailer",
    "profile": {
      "shopName": "...",
      "contactPerson": "..."
    }
  }
}
```

---

## 3. 商城 API

### 3.1 取得商城資訊

```
GET /shops/:shopId
```

### 3.2 取得自己的商城（批發商）

```
GET /shops/my
```

### 3.3 更新商城資訊

```
PUT /shops/my
```

**Request**
```json
{
  "name": "可愛童裝",
  "description": "...",
  "logoUrl": "https://...",
  "minOrderAmount": "1000.00"
}
```

### 3.4 列出所有商城（零售商瀏覽用）

```
GET /shops?page=1&pageSize=20
```

---

## 4. 商品 API

### 4.1 列出商品

```
GET /products?shopId=1&category=上衣&tags=可愛,卡通&page=1&pageSize=20
```

**Query 參數**
- `shopId` (optional) — 篩選特定商城
- `category` (optional) — 篩選品類
- `tags` (optional, comma-separated) — 篩選標籤
- `search` (optional) — 關鍵字搜尋
- `minPrice`, `maxPrice` (optional)

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "可愛小熊上衣",
      "category": "上衣",
      "basePrice": "250.00",
      "primaryImageUrl": "https://...",
      "tags": ["可愛", "卡通"],
      "shop": { "id": 1, "name": "..." }
    }
  ],
  "pagination": { ... }
}
```

### 4.2 取得商品詳情

```
GET /products/:productId
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "...",
    "description": "...",
    "category": "...",
    "ageRange": "3-6M",
    "gender": "unisex",
    "basePrice": "250.00",
    "suggestedRetailPrice": "499.00",
    "attributes": { "material": "100% 純棉" },
    "images": [ { "id": 1, "url": "...", "isPrimary": true } ],
    "variants": [
      {
        "id": 10,
        "sku": "BEAR-80-PINK",
        "size": "80cm",
        "color": "粉紅",
        "price": "250.00",
        "stock": 50
      }
    ],
    "tags": ["可愛", "卡通"]
  }
}
```

### 4.3 建立商品（批發商）

```
POST /products
```

**Request**
```json
{
  "name": "可愛小熊上衣",
  "description": "...",
  "category": "上衣",
  "ageRange": "3-6M",
  "gender": "unisex",
  "basePrice": "250.00",
  "attributes": { "material": "100% 純棉" },
  "tags": [1, 2, 3],
  "variants": [
    { "size": "80cm", "color": "粉紅", "stock": 50 },
    { "size": "90cm", "color": "粉紅", "stock": 30 }
  ]
}
```

### 4.4 更新商品

```
PUT /products/:productId
```

### 4.5 刪除商品（軟刪除）

```
DELETE /products/:productId
```

### 4.6 上傳商品圖片

```
POST /products/:productId/images
Content-Type: multipart/form-data
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://r2.../image.jpg",
    "isPrimary": false
  }
}
```

### 4.7 以圖搜圖（跨商城）

```
GET /products/:productId/similar?limit=10
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "...",
      "similarity": 0.89,
      "shop": { "id": 2, "name": "..." },
      "primaryImageUrl": "..."
    }
  ]
}
```

### 4.8 以文搜圖

```
GET /products/search?query=藍色卡通動物上衣&limit=20
```

---

## 5. 標籤 API

### 5.1 列出商城的標籤

```
GET /shops/:shopId/tags
```

### 5.2 建立標籤（批發商）

```
POST /tags
```

**Request**
```json
{
  "name": "可愛",
  "category": "風格",
  "color": "#FFB6C1"
}
```

### 5.3 AI 自動建議標籤（依商品圖）

```
POST /tags/suggest
Content-Type: multipart/form-data
```

**Request**: 上傳圖片檔案

**Response 200**
```json
{
  "success": true,
  "data": {
    "suggestions": ["可愛", "卡通", "動物", "粉色系", "短袖"]
  }
}
```

---

## 6. 購物車 API

購物車存在 Redis，無需落地資料庫。

### 6.1 取得購物車

```
GET /cart
```

### 6.2 加入購物車

```
POST /cart/items
```

**Request**
```json
{
  "variantId": 10,
  "quantity": 5
}
```

### 6.3 更新購物車項目

```
PUT /cart/items/:variantId
```

**Request**
```json
{ "quantity": 8 }
```

### 6.4 移除購物車項目

```
DELETE /cart/items/:variantId
```

### 6.5 清空購物車

```
DELETE /cart
```

---

## 7. 訂單 API

### 7.1 建立訂單（零售商結帳）

```
POST /orders
```

**Request**
```json
{
  "shopId": 1,
  "items": [
    { "variantId": 10, "quantity": 5 },
    { "variantId": 12, "quantity": 3 }
  ],
  "shippingAddress": "台北市信義區...",
  "contactName": "王小明",
  "contactPhone": "0912345678",
  "retailerNote": "希望週五前出貨"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": 100,
    "orderNumber": "ORD-20260418-0001",
    "status": "pending",
    "total": "2500.00",
    ...
  }
}
```

### 7.2 列出訂單

```
GET /orders?status=pending&page=1
```

**說明**:
- 零售商看到自己的訂單
- 批發商看到自己商城的訂單
- 管理員看到所有訂單

### 7.3 取得訂單詳情

```
GET /orders/:orderId
```

### 7.4 更新訂單狀態（批發商）

```
PATCH /orders/:orderId/status
```

**Request**
```json
{
  "status": "shipped",
  "note": "已透過黑貓宅急便出貨"
}
```

**狀態機規則**:
- `pending` → `paid` / `cancelled`
- `paid` → `processing` / `refunded`
- `processing` → `shipped`
- `shipped` → `completed`

### 7.5 取消訂單（零售商）

```
POST /orders/:orderId/cancel
```

僅 `pending` 狀態的訂單可取消。

---

## 8. 推薦 API

### 8.1 取得個人化推薦

```
GET /recommendations?type=for_you&limit=20
```

**Query 參數**
- `type`: `for_you`（綜合）| `similar`（相似）| `trending`（熱門）| `complementary`（互補）
- `limit`: 最多 50

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "product": { ... },
      "score": 0.89,
      "reason": "similar_style",
      "reasonText": "因為您喜歡可愛風，這件和您上次買的卡通上衣很搭！"
    }
  ]
}
```

### 8.2 取得相似商品

```
GET /products/:productId/recommendations?limit=10
```

---

## 9. 使用者行為追蹤 API

### 9.1 記錄行為

```
POST /behaviors
```

**Request**
```json
{
  "productId": 123,
  "action": "view",
  "metadata": { "duration": 15, "source": "homepage" }
}
```

**Action 值**: `view`, `add_to_cart`, `remove_from_cart`, `purchase`, `favorite`

### 9.2 批次記錄（效能優化）

```
POST /behaviors/batch
```

**Request**
```json
{
  "events": [
    { "productId": 1, "action": "view", "timestamp": "..." },
    { "productId": 2, "action": "view", "timestamp": "..." }
  ]
}
```

---

## 10. 分析 API（批發商）

### 10.1 訂單統計

```
GET /analytics/orders/summary?startDate=2026-01-01&endDate=2026-01-31
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "totalRevenue": "375000.00",
    "averageOrderValue": "2500.00",
    "byStatus": {
      "pending": 10,
      "paid": 80,
      "shipped": 45,
      "completed": 15
    }
  }
}
```

### 10.2 熱銷商品排行

```
GET /analytics/products/top?limit=10&period=30d
```

### 10.3 零售商偏好分析

```
GET /analytics/retailers/preferences?retailerId=1
```

---

## 11. 推薦服務內部 API（FastAPI）

以下為 NestJS backend 呼叫 FastAPI recommender 的內部 API，**不對外暴露**。

### 11.1 萃取圖像向量

```
POST http://recommender:8000/internal/embeddings/image
```

**Request**
```json
{ "imageUrl": "https://r2.../image.jpg" }
```

**Response 200**
```json
{ "embedding": [0.12, -0.03, ...] }
```

### 11.2 重算特定使用者推薦

```
POST http://recommender:8000/internal/recommendations/recompute
```

**Request**
```json
{ "retailerId": 123 }
```

### 11.3 以文搜圖向量化

```
POST http://recommender:8000/internal/embeddings/text
```

**Request**
```json
{ "text": "藍色卡通動物上衣" }
```
