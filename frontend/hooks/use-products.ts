'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useMyShop } from '@/hooks/use-shop'

export type ProductVariant = {
  id: number
  sku: string
  size: string
  color: string
  price: string
  stock: number
}

export type ProductTag = {
  id: number
  name: string
  color: string | null
}

export type ProductStatus = 'active' | 'draft' | 'sold_out' | 'archived'

export type Product = {
  id: number
  name: string
  status: ProductStatus
  category: string
  basePrice: string
  suggestedRetailPrice: string | null
  primaryImageUrl: string | null
  tags: ProductTag[]
  variants?: ProductVariant[]
  shop: { id: number; name: string }
  createdAt: string
  lowStockCount?: number
}

export type ProductDetail = Omit<Product, 'tags'> & {
  description: string | null
  ageRange: string | null
  gender: string | null
  attributes: Record<string, string>
  images: { id: string; url: string; isPrimary: boolean; altText: string | null }[]
  tags: string[]
}

type ProductsResponse = {
  data: Product[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

type CreateProductPayload = {
  name: string
  description: string
  category: string
  ageRange: string
  gender: string
  basePrice: string
  suggestedRetailPrice?: string
  attributes: Record<string, string>
  tags: number[]
  variants: { size: string; color: string; stock: number; price?: string }[]
  imageUrls?: string[]
}

export function useMyProducts(params: { page?: number; search?: string } = {}) {
  const { page = 1, search } = params
  const { data: shop } = useMyShop()

  return useQuery({
    queryKey: ['my-products', { page, search, shopId: shop?.id }],
    queryFn: async () => {
      const res = await api.get<ProductsResponse>('/products', {
        params: { page, pageSize: 20, search, shopId: shop!.id, includeInactive: true },
      })
      return res.data
    },
    enabled: !!shop?.id,
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get<{ data: ProductDetail }>(`/products/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      const res = await api.post<{ data: ProductDetail }>('/products', payload)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
    },
  })
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<CreateProductPayload>) => {
      const res = await api.put<{ data: ProductDetail }>(`/products/${id}`, payload)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
    },
  })
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'active' | 'draft' }) => {
      await api.patch(`/products/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
    },
  })
}

export type FTSProduct = {
  id: string
  name: string
  headline: string
  category: string
  basePrice: string
  primaryImageUrl: string | null
  shop: { id: string; name: string }
  score: number
}

type FTSResponse = {
  data: FTSProduct[]
  query: string
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export function useProductFTSearch(q: string, shopId?: string) {
  return useQuery({
    queryKey: ['product-fts', q, shopId],
    queryFn: async () => {
      const res = await api.get<FTSResponse>('/products/search', {
        params: { q, shopId, pageSize: 20 },
      })
      return res.data
    },
    enabled: q.trim().length >= 1,
    staleTime: 10_000,
  })
}

export function useShopTags(shopId: number | undefined) {
  return useQuery({
    queryKey: ['shop-tags', shopId],
    queryFn: async () => {
      const res = await api.get<{ data: ProductTag[] }>(`/shops/${shopId}/tags`)
      return res.data.data
    },
    enabled: !!shopId,
  })
}
