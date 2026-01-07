import type { AdSlot, Article, Category, HomepagePayload, CategoryPayload, ArticlePayload, ArchivePayload } from '../types'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const asString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? v : [])

export const normalizeCategory = (c: unknown): Category => {
  const obj = isObject(c) ? c : {}
  const slug = asString(obj.slug, asString(obj.id, '')).trim()
  return {
    slug,
    name: asString(obj.name, asString(obj.title, slug || 'Untitled')),
    description: asString(obj.description),
    pinned: Boolean(obj.pinned),
  }
}

export const normalizeArticle = (a: unknown): Article => {
  const obj = isObject(a) ? a : {}
  const category = obj.category && isObject(obj.category)
    ? normalizeCategory(obj.category)
    : asString(obj.category, '')
  return {
    slug: asString(obj.slug, ''),
    title: asString(obj.title, 'Untitled'),
    excerpt: asString(obj.excerpt),
    dek: asString(obj.dek),
    category,
    date: asString(obj.date),
    author: asString(obj.author),
    imageUrl: asString(obj.imageUrl),
    bodyHtml: asString(obj.bodyHtml),
    bodyMarkdown: asString(obj.bodyMarkdown),
    tags: asArray<string>(obj.tags),
  }
}

export const normalizeAd = (ad: unknown): AdSlot | null => {
  const obj = isObject(ad) ? ad : {}
  const type = asString(obj.type) as AdSlot['type']
  if (type === 'IMAGE_LINK') {
    if (!obj.imageUrl || !obj.href) return null
    return {
      id: asString(obj.id),
      placement: asString(obj.placement),
      size: asString(obj.size),
      type,
      imageUrl: asString(obj.imageUrl),
      href: asString(obj.href),
      alt: asString(obj.alt),
      label: asString(obj.label),
      active: Boolean(obj.active ?? true),
      order: Number(obj.order) || 0,
    }
  }
  if (type === 'EMBED_SNIPPET') {
    if (!obj.html) return null
    return {
      id: asString(obj.id),
      placement: asString(obj.placement),
      size: asString(obj.size),
      type,
      html: asString(obj.html),
      label: asString(obj.label),
      active: Boolean(obj.active ?? true),
      order: Number(obj.order) || 0,
    }
  }
  return null
}

export const normalizeHomepage = (payload: unknown): HomepagePayload => {
  const obj = isObject(payload) ? payload : {}
  const categories = asArray(obj.categories).map(normalizeCategory)
  const normalizeArticles = (key: string) => asArray(obj[key]).map(normalizeArticle)
  const ads = isObject(obj.ads) ? obj.ads : {}
  return {
    categories,
    latest: normalizeArticles('latest'),
    lead: obj.lead ? normalizeArticle(obj.lead) : null,
    daily: normalizeArticles('daily'),
    featured: normalizeArticles('featured'),
    tiles: normalizeArticles('tiles'),
    ads: {
      sidebar: asArray(ads.sidebar).map(normalizeAd).filter(Boolean) as AdSlot[],
      inline: asArray(ads.inline).map(normalizeAd).filter(Boolean) as AdSlot[],
    },
  }
}

export const normalizeCategoryPayload = (payload: unknown): CategoryPayload => {
  const obj = isObject(payload) ? payload : {}
  const category = obj.category ? normalizeCategory(obj.category) : { slug: '', name: '' }
  return {
    category,
    articles: asArray(obj.articles).map(normalizeArticle),
    daily: asArray(obj.daily).map(normalizeArticle),
    mostRead: asArray(obj.mostRead).map(normalizeArticle),
    page: Number(obj.page) || 1,
    totalPages: Number(obj.totalPages) || 1,
  }
}

export const normalizeArticlePayload = (payload: unknown): ArticlePayload => {
  const base = normalizeArticle(payload)
  const obj = isObject(payload) ? payload : {}
  const ads = isObject(obj.ads) ? obj.ads : {}
  return {
    ...base,
    related: asArray(obj.related).map(normalizeArticle),
    ads: {
      sidebar: asArray(ads.sidebar).map(normalizeAd).filter(Boolean) as AdSlot[],
      inline: asArray(ads.inline).map(normalizeAd).filter(Boolean) as AdSlot[],
    },
  }
}

export const normalizeArchive = (payload: unknown): ArchivePayload => {
  const obj = isObject(payload) ? payload : {}
  return {
    results: asArray(obj.results).map((r) => {
      const rec = isObject(r) ? r : {}
      return {
        headline: asString(rec.headline, asString(rec.title, 'Untitled')),
        slug: asString(rec.slug, ''),
        category: asString(rec.category, ''),
        date: asString(rec.date),
      }
    }),
    page: Number(obj.page) || 1,
    totalPages: Number(obj.totalPages) || 1,
  }
}


