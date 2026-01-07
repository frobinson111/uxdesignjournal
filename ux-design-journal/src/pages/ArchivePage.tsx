import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { fetchArchive } from '../api/public'
import type { ArchivePayload } from '../types'

export function ArchivePage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<ArchivePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const category = params.get('category') || ''
  const q = params.get('q') || ''
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const page = Number(params.get('page') || 1)

  useEffect(() => {
    setLoading(true)
    fetchArchive({ category, q, from, to, page })
      .then(setData)
      .catch((err) => {
        console.error(err)
        setError('Unable to load archive.')
      })
      .finally(() => setLoading(false))
  }, [category, q, from, to, page])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const next = new URLSearchParams()
    next.set('q', (form.q as HTMLInputElement).value)
    next.set('category', (form.category as HTMLInputElement).value)
    next.set('from', (form.from as HTMLInputElement).value)
    next.set('to', (form.to as HTMLInputElement).value)
    next.set('page', '1')
    setParams(next)
  }

  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  return (
    <div className="wrap section archive-page">
      <header className="category-header">
        <p className="eyebrow">Archive</p>
        <h1>Browse the Journal</h1>
      </header>

      <form className="archive-filter" onSubmit={onSubmit}>
        <input name="q" defaultValue={q} placeholder="Search headline" />
        <input name="category" defaultValue={category} placeholder="Category slug" />
        <input name="from" type="date" defaultValue={from} />
        <input name="to" type="date" defaultValue={to} />
        <button type="submit">Filter</button>
      </form>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          {data.results.length === 0 && <p className="muted">No results yet.</p>}
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

