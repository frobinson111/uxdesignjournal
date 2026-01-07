import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { fetchArticle } from '../api/public'
import type { ArticlePayload } from '../types'
import { AdSlotRenderer } from '../components/AdSlotRenderer'

export function ArticlePage() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<ArticlePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        {data.ads?.sidebar?.map((slot) => <AdSlotRenderer key={slot.id} slot={slot} placement="sidebar" />)}
      </aside>
    </div>
  )
}

