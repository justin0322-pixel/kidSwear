/**
 * API Client — 集中管理所有後端 API 呼叫
 * 基於 frontend/lib/api.ts 的 axios instance
 */

import { api, type ApiResponse, type PaginatedResponse } from './api'

// ─── 共用型別 ────────────────────────────────────────────────

export type UserRole = 'wholesaler' | 'retailer' | 'admin'
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded'
export type ProductStatus = 'active' | 'inactive'

export type User = {
  id: string
  email: string
  role: UserRole
  name: string
  createdAt: string
}

export type Product = {
  id: string
  name: string
  description: string
  status: ProductStatus
  category: string
  gender: string
  tags: Tag[]
  variants: ProductVariant[]
  images: ProductImage[]
  shopId: string
  imageEmbedding?: number[]
  createdAt: string
}

export type ProductVariant = {
  id: number
  size: string
  color: string
  price: string
  stock: number
  lowStockThreshold: number
}

export type ProductImage = {
  id: string
  url: string
  sortOrder: number
}

export type Tag = {
  id: string
  name: string
}

export type Shop = {
  id: string
  slug: string
  name: string
  logoUrl?: string
  bannerUrl?: string
  minDeposit: string
  isActive: boolean
}

export type Order = {
  id: string
  status: OrderStatus
  totalAmount: string
  shopId: string
  shopName: string
  items: OrderItem[]
  statusHistory: OrderStatusHistory[]
  createdAt: string
}

export type OrderItem = {
  id: string
  productId: string
  productName: string
  variantId: number
  size: string
  color: string
  quantity: number
  unitPrice: string
}

export type OrderStatusHistory = {
  status: OrderStatus
  note?: string
  createdAt: string
}

export type CartItem = {
  variantId: number
  productId: string
  productName: string
  size: string
  color: string
  price: string
  quantity: number
  stock: number
  imageUrl?: string
}

export type Recommendation = {
  product: Product
  score: number
  reason?: string
}

// ─── Auth ─────────────────────────────────────────────────────

export const authApi = {
  register: (body: { email: string; password: string; role: UserRole; name: string }) =>
    api.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/register', body),

  login: (body: { email: string; password: string }) =>
    api.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/login', body),

  refresh: () =>
    api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),

  me: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (body: { shopName?: string; contactPerson?: string; shippingAddress?: string }) =>
    api.put<ApiResponse<User>>('/auth/profile', body),

  /** 跳轉 LINE OAuth（直接 window.location.href 使用此 URL） */
  lineLoginUrl: () => `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/line`,

  /** 跳轉 Google OAuth */
  googleLoginUrl: () => `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/google`,
}

// ─── Products ─────────────────────────────────────────────────

export const productsApi = {
  search: (params: { q: string; shopId?: string; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Product & { headline?: string }>>('/products/search', { params }),

  list: (params?: { page?: number; pageSize?: number; shopId?: string; category?: string; status?: ProductStatus }) =>
    api.get<PaginatedResponse<Product>>('/products', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Product>>(`/products/${id}`),

  create: (body: {
    name: string
    description?: string
    category: string
    gender?: string
    tagIds?: string[]
    imageUrls?: string[]
    variants: Omit<ProductVariant, 'id'>[]
  }) =>
    api.post<ApiResponse<Product>>('/products', body),

  update: (id: string, body: Partial<{
    name: string; description?: string; category: string
    gender?: string; tagIds?: string[]; imageUrls?: string[]
    variants: Omit<ProductVariant, 'id'>[]
  }>) =>
    api.put<ApiResponse<Product>>(`/products/${id}`, body),

  remove: (id: string) =>
    api.delete(`/products/${id}`),
}

// ─── Orders ───────────────────────────────────────────────────

export const ordersApi = {
  create: (body: { items: { variantId: number; quantity: number }[] }) =>
    api.post<ApiResponse<Order>>('/orders', body),

  list: (params?: { status?: OrderStatus; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Order>>('/orders', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`),

  updateStatus: (id: string, body: { status: OrderStatus; note?: string; trackingNumber?: string }) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}/status`, body),

  cancel: (id: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/cancel`),
}

// ─── Cart ─────────────────────────────────────────────────────

export const cartApi = {
  get: () =>
    api.get<ApiResponse<{ items: CartItem[]; totalAmount: string }>>('/cart'),

  addItem: (body: { variantId: number; quantity: number }) =>
    api.post<ApiResponse<{ items: CartItem[] }>>('/cart/items', body),

  updateItem: (variantId: number, quantity: number) =>
    api.put<ApiResponse<{ items: CartItem[] }>>(`/cart/items/${variantId}`, { quantity }),

  removeItem: (variantId: number) =>
    api.delete<ApiResponse<{ items: CartItem[] }>>(`/cart/items/${variantId}`),

  clear: () =>
    api.delete('/cart'),
}

// ─── Shops ────────────────────────────────────────────────────

export const shopsApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Shop>>('/shops', { params }),

  getMyShop: () =>
    api.get<ApiResponse<Shop>>('/shops/my'),

  getMyStats: () =>
    api.get<ApiResponse<{ todayOrders: number; monthRevenue: string; productCount: number }>>('/shops/my/stats'),

  getMyAnalytics: () =>
    api.get<ApiResponse<{
      revenueByDay: { date: string; revenue: string }[]
      topProducts: { productId: string; name: string; revenue: string }[]
      topRetailers: { retailerId: string; name: string; orderCount: number }[]
      statusDistribution: { status: OrderStatus; count: number }[]
    }>>('/shops/my/analytics'),

  updateMyShop: (body: { name?: string; logoUrl?: string; bannerUrl?: string; minDeposit?: string }) =>
    api.put<ApiResponse<Shop>>('/shops/my', body),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Shop>>(`/shops/slug/${slug}`),

  getById: (id: string) =>
    api.get<ApiResponse<Shop>>(`/shops/${id}`),

  getTags: (shopId: string) =>
    api.get<ApiResponse<Tag[]>>(`/shops/${shopId}/tags`),
}

// ─── Recommendations ──────────────────────────────────────────

export const recommendationsApi = {
  forYou: (limit = 12) =>
    api.get<ApiResponse<Recommendation[]>>('/recommendations/for-you', { params: { limit } }),

  searchByText: (body: { query: string; limit?: number; category?: string }) =>
    api.post<ApiResponse<(Product & { similarity: number })[]>>('/recommendations/search/text', body),

  searchByImage: (file: File, limit = 12, category?: string) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ApiResponse<(Product & { similarity: number })[]>>(
      '/recommendations/search/image',
      form,
      { params: { limit, category } },
    )
  },

  suggestTags: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ApiResponse<{ tags: { name: string; score: number }[] }>>(
      '/recommendations/tags/suggest',
      form,
    )
  },
}

// ─── Tags ─────────────────────────────────────────────────────

export const tagsApi = {
  create: (body: { name: string; shopId?: string }) =>
    api.post<ApiResponse<Tag>>('/tags', body),

  remove: (id: string) =>
    api.delete(`/tags/${id}`),
}

// ─── Admin ────────────────────────────────────────────────────

export const adminApi = {
  listUsers: (params?: { page?: number; pageSize?: number; role?: UserRole }) =>
    api.get<PaginatedResponse<User & { status: string }>>('/admin/users', { params }),

  updateUserStatus: (id: string, status: 'active' | 'suspended') =>
    api.patch<ApiResponse<null>>(`/admin/users/${id}/status`, { status }),

  listShops: (params?: { page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<Shop>>('/admin/shops', { params }),

  updateShopStatus: (id: string, status: 'active' | 'inactive') =>
    api.patch<ApiResponse<null>>(`/admin/shops/${id}/status`, { status }),
}
