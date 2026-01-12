import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDeleteArticle, adminListArticles, adminUpdateArticleFields } from '../../api/admin'
import type { AdminArticleListItem } from '../../types'
import { useAuth } from '../../auth/AuthContext'
import { useCategories } from '../../hooks/useCategories'

export function AdminArticlesList() {
  const { token } = useAuth()
  const { categories } = useCategories()
  const [items, setItems] = useState<AdminArticleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mutating, setMutating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to page 1 on search change
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, categoryFilter])

  const fetchArticles = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await adminListArticles(token, {
        page,
        q: debouncedSearch || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        limit: 20,
      })
      setItems(res.items)
      setTotalPages(res.totalPages)
      setTotal(res.total)
    } catch (err) {
      console.error(err)
      setError('Unable to load articles.')
    } finally {
      setLoading(false)
    }
  }, [token, page, debouncedSearch, statusFilter, categoryFilter])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Articles</h1>
        <Link className="btn" to="/admin/articles/new">New Article</Link>
      </div>

      {/* Filters */}
      <div className="admin-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by title…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.5rem', minWidth: '200px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
        {(searchQuery || statusFilter || categoryFilter) && (
          <button
            className="btn btn-sm ghost"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('')
              setCategoryFilter('')
            }}
          >
            Clear Filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.9rem' }}>
          {total} article{total !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Headline</th>
            <th>Category</th>
            <th>Status</th>
            <th>Featured</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.slug}>
              <td>{item.title || item.slug}</td>
              <td>{item.category}</td>
              <td>{item.status}</td>
              <td>{item.status === 'published' && item.featured ? 'Yes' : 'No'}</td>
              <td className="table-actions">
                <Link className="btn btn-sm" to={`/admin/articles/${item.slug}`}>Edit</Link>
                <button
                  className="btn btn-sm ghost"
                  disabled={mutating === item.slug}
                  onClick={async () => {
                    if (!token) return
                    setMutating(item.slug)
                    try {
                      const makeFeatured = !(item as any).featured
                      const featureOrder = Math.floor(Date.now() / 1000)
                      await adminUpdateArticleFields(token, item.slug, { featured: makeFeatured, featureOrder, status: 'published' })
                      setItems((prev) =>
                        prev.map((p) =>
                          p.slug === item.slug ? { ...p, featured: makeFeatured, featureOrder, status: 'published' } : p
                        )
                      )
                    } catch (err) {
                      console.error(err)
                      setError('Could not update featured status.')
                    } finally {
                      setMutating(null)
                    }
                  }}
                >
                  {((item as any).featured ? 'Unfeature' : 'Feature')}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={deleting === item.slug}
                  onClick={async () => {
                    if (!token) return
                    if (!confirm('Delete this article?')) return
                    setDeleting(item.slug)
                    try {
                      await adminDeleteArticle(token, item.slug)
                      setItems((prev) => prev.filter((p) => p.slug !== item.slug))
                      setTotal((t) => t - 1)
                    } catch (err) {
                      console.error(err)
                      setError('Could not delete article.')
                    } finally {
                      setDeleting(null)
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && <tr><td colSpan={5}>No articles found.</td></tr>}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', justifyContent: 'center' }}>
          <button
            className="btn btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ padding: '0 1rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

