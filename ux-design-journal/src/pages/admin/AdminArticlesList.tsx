import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDeleteArticle, adminListArticles, adminUpdateArticleFields } from '../../api/admin'
import type { AdminArticleListItem } from '../../types'
import { useAuth } from '../../auth/AuthContext'

export function AdminArticlesList() {
  const { token } = useAuth()
  const [items, setItems] = useState<AdminArticleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mutating, setMutating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    adminListArticles(token, { page: 1 })
      .then((res) => setItems(res.items))
      .catch((err) => {
        console.error(err)
        setError('Unable to load articles.')
      })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Articles</h1>
        <Link className="btn" to="/admin/articles/new">New Article</Link>
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
          {items.length === 0 && !loading && <tr><td colSpan={4}>No articles found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

