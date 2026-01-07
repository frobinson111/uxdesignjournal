import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchArticles } from '../api/public'
import type { ArchivePayload } from '../types'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<ArchivePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const q = params.get('q') || ''
  const page = Number(params.get('page') || 1)

  useEffect(() => {
    if (!q) return
    setLoading(true)
    searchArticles(q, page)
      .then(setData)
      .catch((err) => {
        console.error(err)
        setError('Search failed.')
      })
      .finally(() => setLoading(false))
  }, [q, page])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const next = new URLSearchParams()
    next.set('q', (form.q as HTMLInputElement).value)
    next.set('page', '1')
    setParams(next)
  }

  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  return (
    <div className="wrap section search-page">
      <header className="category-header">
        <p className="eyebrow">Search</p>
        <h1>Find stories</h1>
      </header>

      <form className="archive-filter" onSubmit={onSubmit}>
        <input name="q" placeholder="Search the Journal" defaultValue={q} />
        <button type="submit">Search</button>
      </form>

      {!q && <p className="muted">Start typing to search.</p>}
      {loading && <p>Searching…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          {data.results.length === 0 && <p className="muted">No results.</p>}
          <ul className="archive-results">
            {data.results.map((item) => (
              <li key={item.slug}>
                <div className="meta-row">
                  <span className="meta-cat">{item.category}</span>
                  {item.date && <span className="meta-date">{item.date}</span>}
                </div>
                <Link to={`/article/${item.slug}`}>{item.headline}</Link>
              </li>
            ))}
          </ul>
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {data.totalPages}</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}

