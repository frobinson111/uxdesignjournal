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

// Admin Users Management
export interface AdminUser {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
}

export async function adminListUsers(token: string) {
  return request<{ users: AdminUser[] }>('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminCreateUser(token: string, email: string, password: string) {
  return request<AdminUser>('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, password }),
  })
}

export async function adminUpdateUserStatus(token: string, id: string, status: 'active' | 'inactive') {
  return request<AdminUser>(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
}

export async function adminDeleteUser(token: string, id: string) {
  return request<{ ok: boolean }>(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// Popup Lead Capture
export interface PopupConfig {
  id?: string
  name: string
  title: string
  description: string
  imageUrl: string
  imageCaption: string
  pdfUrl: string
  pdfTitle: string
  buttonText: string
  delaySeconds: number
  active: boolean
  leadCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface PopupLead {
  id: string
  email: string
  popupConfigId: string
  popupName: string
  popupTitle: string
  status: string
  ipAddress: string
  userAgent: string
  createdAt: string
}

export async function adminListPopups(token: string) {
  return request<{ popups: PopupConfig[] }>('/api/admin/popups', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminGetPopup(token: string, id: string) {
  return request<PopupConfig>(`/api/admin/popups/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminSavePopup(token: string, popup: PopupConfig) {
  const isNew = !popup.id
  const path = isNew ? '/api/admin/popups' : `/api/admin/popups/${popup.id}`
  const method = isNew ? 'POST' : 'PUT'
  return request<PopupConfig>(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(popup),
  })
}

export async function adminDeletePopup(token: string, id: string) {
  return request<{ success: boolean; message: string }>(`/api/admin/popups/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminListPopupLeads(token: string, params: { page?: number; limit?: number; popupId?: string; search?: string } = {}) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.popupId) search.set('popupId', params.popupId)
  if (params.search) search.set('search', params.search)
  const qs = search.toString()
  const path = `/api/admin/popup-leads${qs ? `?${qs}` : ''}`
  return request<{ leads: PopupLead[]; page: number; limit: number; total: number; totalPages: number }>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function adminExportPopupLeads(token: string, popupId?: string) {
  const API_BASE = import.meta.env.VITE_API_BASE || ''
  const qs = popupId ? `?popupId=${popupId}` : ''
  const url = `${API_BASE}/api/admin/popup-leads/export${qs}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `popup-leads-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}

export async function adminDeletePopupLead(token: string, id: string) {
  return request<{ success: boolean; message: string }>(`/api/admin/popup-leads/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
