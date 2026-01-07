import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { fetchCategory } from '../api/public'
import type { CategoryPayload } from '../types'
import { DailyFeed } from '../components/DailyFeed'

export function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 1)
  const [data, setData] = useState<CategoryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchCategory(categorySlug, page)
      .then(setData)
      .catch((err) => {
        console.error(err)
        setError('Unable to load category.')
      })
      .finally(() => setLoading(false))
  }, [categorySlug, page])

  const handlePage = (next: number) => {
    setSearchParams({ page: String(next) })
  }

  if (loading) return <div className="wrap section">Loading…</div>
  if (error) return <div className="wrap section error">{error}</div>
  if (!data) return null

  return (
    <div className="wrap section category-page">
      <header className="category-header">
        <p className="eyebrow">Section</p>
        <h1>{data.category.name}</h1>
        {data.category.description && <p className="muted">{data.category.description}</p>}
      </header>

      <div className="category-layout">
        <div className="category-main">
          {data.articles.length === 0 && <p className="muted">No articles yet.</p>}
          {data.articles.map((article) => (
            <article key={article.slug} className="article-row article-row-thumb">
              <Link
                to={`/article/${article.slug}`}
                className="article-thumb"
                style={{ backgroundImage: `url(${article.imageUrl || `https://picsum.photos/seed/${article.slug}/300/300`})` }}
                aria-label={article.title}
              />
              <div className="article-row-body">
                <div className="meta-row">
                  <span className="meta-cat">{typeof article.category === 'string' ? article.category : article.category.name}</span>
                  {article.date && <span className="meta-date">{article.date}</span>}
                </div>
                <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
                {article.excerpt && <p>{article.excerpt}</p>}
              </div>
            </article>
          ))}

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => handlePage(page - 1)}>Previous</button>
            <span>Page {page} of {data.totalPages}</span>
            <button disabled={page >= data.totalPages} onClick={() => handlePage(page + 1)}>Next</button>
          </div>
        </div>

        <aside className="category-sidebar">
          {data.daily && <DailyFeed title="Most Read" items={data.daily} />}
          <div className="ad-spot">Ad slot</div>
        </aside>
      </div>
    </div>
  )
}


