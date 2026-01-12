import { request, postJson } from './client'
import type {
  AdminArticlesResponse,
  AdminLoginResponse,
  ArticlePayload,
  AdSlot,
  AdminContactsResponse,
  Contact,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function adminLogin(email: string, password: string) {
  const res = await postJson<AdminLoginResponse>('/api/admin/login', { email, password })
  return res
}

export async function adminGetMe(token: string) {
  return request<{ email: string }>('/api/admin/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminListArticles(token: string, params: { page?: number; q?: string; status?: string; category?: string; limit?: number } = {}) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.category) search.set('category', params.category)
  if (params.limit) search.set('limit', String(params.limit))
  const qs = search.toString()
  const path = `/api/admin/articles${qs ? `?${qs}` : ''}`
  return request<AdminArticlesResponse>(path, { headers: { Authorization: `Bearer ${token}` } })
}

export async function adminGetArticle(token: string, slug: string) {
  return request<ArticlePayload>(`/api/admin/articles/${slug}`, { headers: { Authorization: `Bearer ${token}` } })
}

export async function adminSaveArticle(token: string, payload: ArticlePayload) {
  const isNew = !payload.slug
  const path = isNew ? '/api/admin/articles' : `/api/admin/articles/${payload.slug}`
  const method = isNew ? 'POST' : 'PUT'
  return request<ArticlePayload>(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function adminUploadImage(token: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  return (await res.json()) as { url: string }
}

export async function adminGenerateAI(token: string, payload: { category: string; topic?: string; sourceUrl?: string; mode?: string }) {
  return request<{ slug: string; status: string }>('/api/admin/ai/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function adminRegenerateImage(token: string, slug: string) {
  return request<{ imageUrl: string }>(`/api/admin/ai/regenerate-image/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminUpdateArticleFields(token: string, slug: string, fields: Partial<ArticlePayload>) {
  return request<ArticlePayload>(`/api/admin/articles/${slug}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
  })
}

export async function adminGetStats(token: string) {
  return request<import('../types').AdminStats>('/api/admin/stats', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminListSubscribers(token: string, params: { page?: number; q?: string } = {}) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.q) search.set('q', params.q)
  const qs = search.toString()
  const path = `/api/admin/subscribers${qs ? `?${qs}` : ''}`
  return request<import('../types').AdminSubscribersResponse>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminUpdateSubscriber(token: string, email: string, fields: { status?: string }) {
  return request(`/api/admin/subscribers/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
  })
}

export async function adminDeleteSubscriber(token: string, email: string) {
  return request(`/api/admin/subscribers/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminBulkDeleteSubscribers(token: string, emails: string[]) {
  return request<{ deleted: number }>('/api/admin/subscribers/bulk-delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ emails }),
  })
}

export async function adminDeleteArticle(token: string, slug: string) {
  return request<{ ok: boolean }>(`/api/admin/articles/${slug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// Ads
export async function adminListAds(token: string, placement?: string) {
  const qs = placement ? `?placement=${encodeURIComponent(placement)}` : ''
  return request<AdSlot[]>(`/api/admin/ads${qs}`, { headers: { Authorization: `Bearer ${token}` } })
}

export async function adminSaveAd(token: string, payload: AdSlot & { placement: string; type: string }) {
  const isNew = !payload.id
  const path = isNew ? '/api/admin/ads' : `/api/admin/ads/${payload.id}`
  const method = isNew ? 'POST' : 'PUT'
  return request<AdSlot>(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteAd(token: string, id: string) {
  return request<{ ok: boolean }>(`/api/admin/ads/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminListContacts(token: string, params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.search) search.set('search', params.search)
  if (params.status) search.set('status', params.status)
  const qs = search.toString()
  const path = `/api/admin/contacts${qs ? `?${qs}` : ''}`
  return request<AdminContactsResponse>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminUpdateContact(token: string, id: string, fields: Partial<Contact>) {
  return request<Contact>(`/api/admin/contacts/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
  })
}

export async function adminDeleteContact(token: string, id: string) {
  return request<{ success: boolean; message: string }>(`/api/admin/contacts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
