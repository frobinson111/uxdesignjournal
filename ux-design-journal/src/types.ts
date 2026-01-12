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
  total: number
  totalPages: number
}

export interface Subscriber {
  id: string
  email: string
  status: 'active' | 'unsubscribed'
  source?: string
  subscribedAt: string
}

export interface AdminSubscribersResponse {
  items: Subscriber[]
  page: number
  totalPages: number
  total: number
}

export interface AdminStats {
  subscribers: number
  articles: number
  categories: number
  ads: number
  admins: number
  recentEvents: Array<{
    type: 'article' | 'subscriber'
    title?: string
    slug?: string
    email?: string
    date: string
  }>
  trends: {
    subscribers: { current: number; previous: number }
    articles: { current: number; previous: number }
  }
}

export interface AdminAIGenerateRequest {
  category: string
  topic?: string
  sourceUrl?: string
  mode?: 'rewrite' | 'from-scratch'
}

export interface AdminAIGenerateResponse {
  slug: string
  status: string
}

export interface ContactPayload {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}

export interface Contact extends ContactPayload {
  id: string
  status: 'new' | 'read' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface AdminContactsResponse {
  contacts: Contact[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ContactSubmitResponse {
  success: boolean
  message: string
  contactId?: string
}
