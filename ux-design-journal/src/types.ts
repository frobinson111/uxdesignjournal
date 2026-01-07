export type AdCreativeType = 'IMAGE_LINK' | 'EMBED_SNIPPET'

export interface Category {
  slug: string
  name: string
  pinned?: boolean
  description?: string
}

export interface Article {
  slug: string
  title: string
  excerpt?: string
  dek?: string
  category: Category | string
  date?: string
  author?: string
  imageUrl?: string
  bodyHtml?: string
  bodyMarkdown?: string
  tags?: string[]
  status?: 'draft' | 'scheduled' | 'published'
  publishAt?: string
  featured?: boolean
  featureOrder?: number
}

export interface AdSlot {
  id?: string
  placement?: string
  size?: string
  type: AdCreativeType
  imageUrl?: string
  href?: string
  alt?: string
  html?: string
  label?: string
  active?: boolean
  order?: number
}

export interface HomepagePayload {
  categories: Category[]
  latest: Article[]
  lead: Article | null
  daily: Article[]
  featured: Article[]
  tiles: Article[]
  ads?: {
    sidebar?: AdSlot[]
    inline?: AdSlot[]
  }
}

export interface CategoryPayload {
  category: Category
  articles: Article[]
  daily?: Article[]
  mostRead?: Article[]
  page: number
  totalPages: number
}

export interface ArticlePayload extends Article {
  related?: Article[]
  ads?: {
    sidebar?: AdSlot[]
    inline?: AdSlot[]
  }
}

export interface ArchiveResult {
  headline: string
  slug: string
  category: string
  date?: string
}

export interface ArchivePayload {
  results: ArchiveResult[]
  page: number
  totalPages: number
}

export interface AdminLoginResponse {
  token: string
  user: { email: string }
}

export interface AdminArticleListItem {
  id: string
  slug: string
  title: string
  category: string
  date?: string
  status?: string
  featured?: boolean
  featureOrder?: number
}

export interface AdminArticlesResponse {
  items: AdminArticleListItem[]
  page: number
  totalPages: number
}

