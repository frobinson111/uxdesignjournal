import { request, postJson } from './client'
import type {
  ArchivePayload,
  ArticlePayload,
  Category,
  CategoryPayload,
  HomepagePayload,
} from '../types'
import {
  normalizeArchive,
  normalizeArticlePayload,
  normalizeCategory,
  normalizeCategoryPayload,
  normalizeHomepage,
} from './normalize'

const mockCategories: Category[] = [
  { slug: 'practice', name: 'Practice' },
  { slug: 'design-reviews', name: 'Design Reviews' },
  { slug: 'career', name: 'Career' },
  { slug: 'signals', name: 'Signals' },
  { slug: 'journal', name: 'Journal' },
]

export async function fetchCategories() {
  const res = await request<Category[]>('/api/public/categories', { mockResponse: mockCategories })
  return res.map(normalizeCategory)
}

export async function fetchHomepage() {
  const mock: HomepagePayload = {
    categories: mockCategories,
    latest: [],
    lead: null,
    daily: [],
    featured: [],
    tiles: [],
    ads: {},
  }
  const payload = await request<HomepagePayload>('/api/public/homepage', { mockResponse: mock })
  return normalizeHomepage(payload)
}

export async function fetchCategory(slug: string, page = 1) {
  const mock: CategoryPayload = {
    category: mockCategories.find((c) => c.slug === slug) ?? { slug, name: slug },
    articles: [],
    page,
    totalPages: 1,
  }
  const payload = await request<CategoryPayload>(`/api/public/category/${slug}?page=${page}`, { mockResponse: mock })
  return normalizeCategoryPayload(payload)
}

export async function fetchArticle(slug: string) {
  const mock: ArticlePayload = {
    slug,
    title: 'Placeholder article',
    category: mockCategories[0],
  }
  const payload = await request<ArticlePayload>(`/api/public/article/${slug}`, { mockResponse: mock })
  return normalizeArticlePayload(payload)
}

export async function fetchArchive(params: { category?: string; from?: string; to?: string; page?: number; q?: string }) {
  const search = new URLSearchParams()
  if (params.category) search.set('category', params.category)
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.q) search.set('q', params.q)
  if (params.page) search.set('page', String(params.page))
  const qs = search.toString()
  const path = `/api/public/archive${qs ? `?${qs}` : ''}`
  const payload = await request<ArchivePayload>(path, { mockResponse: { results: [], page: params.page || 1, totalPages: 1 } })
  return normalizeArchive(payload)
}

export async function searchArticles(q: string, page = 1) {
  const path = `/api/public/search?q=${encodeURIComponent(q)}&page=${page}`
  const payload = await request<ArchivePayload>(path, { mockResponse: { results: [], page, totalPages: 1 } })
  return normalizeArchive(payload)
}

export function subscribe(email: string) {
  return postJson<{ success: boolean; message?: string }>('/api/public/subscribe', { email })
}

export function sessionHeartbeat(seconds: number) {
  return postJson<{ ok: boolean }>('/api/public/session/heartbeat', { engagedSeconds: seconds }, { mockResponse: { ok: true } })
}

export function identifySession(email: string) {
  return postJson<{ ok: boolean }>('/api/public/session/identify', { email }, { mockResponse: { ok: true } })
}

