import { useEffect, useState } from 'react'
import { adminListSubscribers, adminDeleteSubscriber, adminBulkDeleteSubscribers } from '../../api/admin'
import type { Subscriber } from '../../types'
import { useAuth } from '../../auth/AuthContext'

export function AdminSubscribers() {
  const { token } = useAuth()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mutating, setMutating] = useState(false)

  const load = () => {
    if (!token) return
    setLoading(true)
    adminListSubscribers(token, { page })
      .then((res) => {
        setSubscribers(res.items)
        setTotalPages(res.totalPages)
        setTotal(res.total)
      })
      .catch((err) => {
        console.error(err)
        setError('Could not load subscribers.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token, page])

  const handleDelete = async (email: string) => {
    if (!token || !confirm(`Delete subscriber ${email}?`)) return
    setMutating(true)
    try {
      await adminDeleteSubscriber(token, email)
      setSubscribers((prev) => prev.filter((s) => s.email !== email))
      setTotal((t) => t - 1)
    } catch (err) {
      console.error(err)
      setError('Could not delete subscriber.')
    } finally {
      setMutating(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!token || selected.size === 0 || !confirm(`Delete ${selected.size} subscriber(s)?`)) return
    setMutating(true)
    try {
      const emails = Array.from(selected)
      await adminBulkDeleteSubscribers(token, emails)
      setSubscribers((prev) => prev.filter((s) => !selected.has(s.email)))
      setTotal((t) => t - selected.size)
      setSelected(new Set())
    } catch (err) {
      console.error(err)
      setError('Bulk delete failed.')
    } finally {
      setMutating(false)
    }
  }

  const handleExportCSV = () => {
    const csv = ['Email,Status,Source,Subscribed At']
    subscribers.forEach((s) => {
      csv.push(`${s.email},${s.status},${s.source || ''},${s.subscribedAt}`)
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelect = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === subscribers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(subscribers.map((s) => s.email)))
    }
  }

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Users ({total})</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={handleExportCSV} disabled={subscribers.length === 0}>
            Export CSV
          </button>
          <button
            className="btn btn-danger"
            onClick={handleBulkDelete}
            disabled={selected.size === 0 || mutating}
          >
            Delete Selected ({selected.size})
          </button>
        </div>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <input
                type="checkbox"
                checked={subscribers.length > 0 && selected.size === subscribers.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Email</th>
            <th>Status</th>
            <th>Source</th>
            <th>Subscribed</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {subscribers.map((sub) => (
            <tr key={sub.email}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(sub.email)}
                  onChange={() => toggleSelect(sub.email)}
                />
              </td>
              <td>{sub.email}</td>
              <td>{sub.status}</td>
              <td>{sub.source || '—'}</td>
              <td>{new Date(sub.subscribedAt).toLocaleDateString()}</td>
              <td className="table-actions">
                <button className="btn-small btn-danger" onClick={() => handleDelete(sub.email)} disabled={mutating}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {subscribers.length === 0 && !loading && (
            <tr>
              <td colSpan={6}>No subscribers yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  )
}

