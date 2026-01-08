import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { fetchArticle, fetchHomepage } from '../api/public'
import type { Article, ArticlePayload } from '../types'
import { AdSlotRenderer } from '../components/AdSlotRenderer'

type RecentItem = Pick<Article, 'slug' | 'title' | 'imageUrl' | 'category' | 'date'>
const RECENT_KEY = 'uxdj_recent_articles'

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : []
  } catch {
    return []
  }
}

function writeRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 6)))
  } catch {
    // ignore
  }
}

export function ArticlePage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<ArticlePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [latestPosts, setLatestPosts] = useState<Article[]>([])
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchArticle(slug)
      .then(setData)
      .catch((err) => {
        console.error(err)
        setError('Unable to load this article.')
      })
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    fetchHomepage()
      .then((res) => setLatestPosts(res.latest || []))
      .catch(() => setLatestPosts([]))
  }, [])

  useEffect(() => {
    const items = readRecent()
    setRecent(items)
  }, [slug])

  useEffect(() => {
    if (!data?.slug) return
    const current: RecentItem = {
      slug: data.slug,
      title: data.title,
      imageUrl: data.imageUrl,
      category: data.category,
      date: data.date,
    }
    const existing = readRecent()
    const next = [current, ...existing.filter((i) => i.slug !== data.slug)].slice(0, 6)
    writeRecent(next)
    setRecent(next)
  }, [data])

  const sanitizedBody = useMemo(() => {
    if (!data) return ''
    const html = data.bodyHtml || (data.bodyMarkdown ? (marked.parse(data.bodyMarkdown, { async: false }) as string) : '')
    if (!html) return ''
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p','a','strong','em','ul','ol','li','blockquote','code','pre','h2','h3','h4','h5','h6','img','hr','br','table','thead','tbody','tr','th','td'
      ],
      ALLOWED_ATTR: ['href','target','rel','alt','title','src'],
      USE_PROFILES: { html: true },
    })
  }, [data])

  if (loading) return <div className="wrap section">Loading…</div>
  if (error) return <div className="wrap section error">{error}</div>
  if (!data) return null

  const pickOne = <T,>(arr: T[] = []) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined)
  const inlineAds = data.ads?.inline || []
  const readMoreAd = pickOne(inlineAds.filter((ad) => ad.size === '728x250' || ad.placement === 'article-readmore'))
  const readMoreSlot = readMoreAd || {
    id: 'article-readmore-placeholder',
    type: 'IMAGE_LINK',
    imageUrl: 'https://via.placeholder.com/728x250?text=Ad+728x250',
    href: '#',
    label: 'Advertisement',
    alt: '728x250 ad',
  }

  const sidebarSlots = (data.ads?.sidebar?.length ? data.ads.sidebar : [{
    id: 'article-sidebar-placeholder',
    type: 'IMAGE_LINK',
    imageUrl: 'https://via.placeholder.com/300x600?text=Ad+300x600',
    href: '#',
    label: 'Advertisement',
    alt: '300x600 ad',
  }])

  const latestForAside = latestPosts.filter((p) => p.slug !== data.slug).slice(0, 6)

  return (
    <div className="wrap section article-page">
      <article className="article-body">
        <p className="eyebrow">
          {typeof data.category === 'string' ? data.category : data.category?.name}
          {data.date ? <> · {data.date}</> : null}
          {data.author ? <> · {data.author}</> : null}
        </p>
        <h1>{data.title}</h1>
        {data.dek && <p className="dek">{data.dek}</p>}
        {data.imageUrl && <div className="hero-img article-hero" role="img" aria-label={data.title} style={{ backgroundImage: `url(${data.imageUrl})` }} />}
        {sanitizedBody ? (
          <div className="article-content" dangerouslySetInnerHTML={{ __html: sanitizedBody }} />
        ) : (
          <p className="muted">Full article content will appear here.</p>
        )}

        {data.related && data.related.length > 0 && (
          <section className="related">
            <h3>Related reading</h3>
            <ul>
              {data.related.map((rel) => (
                <li key={rel.slug}><Link to={`/article/${rel.slug}`}>{rel.title}</Link></li>
              ))}
            </ul>
          </section>
        )}

        <div className="ad-block">
          <AdSlotRenderer slot={readMoreSlot} placement="inline" size="728x250" />
        </div>
      </article>

      <aside className="article-aside">
        <section className="aside-box" aria-label="Article search">
          <h3 className="aside-title">Article Search</h3>
          <form
            className="aside-search"
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = q.trim()
              if (!trimmed) return
              navigate(`/search?q=${encodeURIComponent(trimmed)}`)
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
            <button type="submit">Search</button>
          </form>
        </section>

        <section className="aside-box" aria-label="Recently viewed">
          <h3 className="aside-title">Recent View</h3>
          {recent.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No recent articles yet.</p>
          ) : (
            <ul className="aside-list">
              {recent.slice(0, 5).map((item) => (
                <li key={item.slug} className="aside-item">
                  <Link
                    to={`/article/${item.slug}`}
                    className="aside-thumb"
                    style={{ backgroundImage: `url(${item.imageUrl || `https://picsum.photos/seed/${item.slug}/200/200`})` }}
                    aria-label={item.title}
                  />
                  <div className="aside-item-body">
                    <div className="aside-meta">
                      {typeof item.category === 'string' ? item.category : item.category?.name}
                    </div>
                    <Link className="aside-link" to={`/article/${item.slug}`}>{item.title}</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="aside-box" aria-label="Latest posts">
          <h3 className="aside-title">Latest Posts</h3>
          {latestForAside.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Loading…</p>
          ) : (
            <ul className="aside-list">
              {latestForAside.map((item) => (
                <li key={item.slug} className="aside-item">
                  <Link
                    to={`/article/${item.slug}`}
                    className="aside-thumb"
                    style={{ backgroundImage: `url(${item.imageUrl || `https://picsum.photos/seed/${item.slug}/200/200`})` }}
                    aria-label={item.title}
                  />
                  <div className="aside-item-body">
                    <div className="aside-meta">
                      {typeof item.category === 'string' ? item.category : item.category?.name}
                    </div>
                    <Link className="aside-link" to={`/article/${item.slug}`}>{item.title}</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="aside-box" aria-label="Advertisement">
          <h3 className="aside-title">Ad</h3>
          {sidebarSlots.map((slot) => <AdSlotRenderer key={slot.id || slot.imageUrl} slot={slot} placement="sidebar" size="300x600" />)}
        </section>
      </aside>
    </div>
  )
}

