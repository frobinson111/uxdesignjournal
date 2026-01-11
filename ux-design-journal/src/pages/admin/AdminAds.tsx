import { useEffect, useMemo, useState } from 'react'
import { adminDeleteAd, adminListAds, adminSaveAd } from '../../api/admin'
import type { AdSlot } from '../../types'
import { useAuth } from '../../auth/AuthContext'

type FormState = {
  id?: string
  placement: string
  size: string
  type: AdSlot['type']
  imageUrl: string
  href: string
  alt: string
  html: string
  label: string
  active: boolean
  order: number
}

const placements = [
  { value: 'homepage-latest', label: 'Homepage – Latest column (300x600)' },
  { value: 'homepage-lead', label: 'Homepage – Lead area (728x250)' },
  { value: 'article-inline', label: 'Article – Inline 300x600' },
  { value: 'article-readmore', label: 'Article – Read more 728x250' },
  { value: 'article-sidebar', label: 'Article – Sidebar' },
]

const sizePresets = ['300x600', '728x250', '300x250', '160x600']

const emptyForm: FormState = {
  placement: placements[0]?.value || '',
  size: '',
  type: 'IMAGE_LINK',
  imageUrl: '',
  href: '',
  alt: '',
  html: '',
  label: 'Advertisement',
  active: true,
  order: 0,
}

export function AdminAds() {
  const { token } = useAuth()
  const [ads, setAds] = useState<AdSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    adminListAds(token)
      .then((res) => setAds(res))
      .catch((err) => {
        console.error(err)
        setError('Could not load ads.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const sortedAds = useMemo(
    () => [...ads].sort((a, b) => (a.placement || '').localeCompare(b.placement || '') || (a.order || 0) - (b.order || 0)),
    [ads]
  )

  const startEdit = (ad: AdSlot) => {
    setForm({
      id: ad.id,
      placement: ad.placement || '',
      size: ad.size || '',
      type: ad.type,
      imageUrl: ad.imageUrl || '',
      href: ad.href || '',
      alt: ad.alt || '',
      html: ad.html || '',
      label: ad.label || '',
      active: ad.active !== false,
      order: ad.order || 0,
    })
  }

  const resetForm = () => setForm(emptyForm)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const payload: AdSlot & { placement: string; type: AdSlot['type'] } = {
        ...form,
        type: form.type,
        placement: form.placement,
        size: form.size,
        imageUrl: form.imageUrl,
        href: form.href,
        html: form.html,
      }
      const saved = await adminSaveAd(token, payload)
      setAds((prev) => {
        const exists = prev.find((p) => p.id === saved.id)
        if (exists) {
          return prev.map((p) => (p.id === saved.id ? saved : p))
        }
        return [...prev, saved]
      })
      resetForm()
    } catch (err) {
      console.error(err)
      setError('Could not save ad. Please check required fields.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: string) => {
    if (!token || !id) return
    if (!confirm('Delete this ad?')) return
    try {
      await adminDeleteAd(token, id)
      setAds((prev) => prev.filter((ad) => ad.id !== id))
    } catch (err) {
      console.error(err)
      setError('Could not delete ad.')
    }
  }

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Ads</h1>
        <button className="btn ghost" onClick={resetForm}>New Ad</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}

      <div className="admin-ads-layout">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label style={{ minWidth: 200 }}>
              Placement
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
                {placements.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label style={{ minWidth: 140 }}>
              Size
              <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                <option value="">Custom</option>
                {sizePresets.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="text"
                placeholder="e.g. 300x600"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </label>
            <label style={{ minWidth: 140 }}>
              Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdSlot['type'] })}>
                <option value="IMAGE_LINK">Image + Link</option>
                <option value="EMBED_SNIPPET">Embed Snippet</option>
              </select>
            </label>
            <label style={{ minWidth: 120 }}>
              Order
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </label>
            <label style={{ minWidth: 120 }}>
              Active
              <select value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          {form.type === 'IMAGE_LINK' && (
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <label style={{ flex: 1, minWidth: 240 }}>
                Image URL
                <input 
                  placeholder="https://... or 300x600?text=Ad (will be auto-prefixed)"
                  value={form.imageUrl} 
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} 
                />
              </label>
              <label style={{ flex: 1, minWidth: 240 }}>
                Link (href)
                <input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
              </label>
              <label style={{ flex: 1, minWidth: 200 }}>
                Alt text
                <input value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} />
              </label>
              <label style={{ flex: 1, minWidth: 200 }}>
                Label
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </label>
            </div>
          )}

          {form.type === 'EMBED_SNIPPET' && (
            <label>
              Embed HTML
              <textarea
                rows={4}
                value={form.html}
                onChange={(e) => setForm({ ...form, html: e.target.value })}
                placeholder="<div>Your embed code</div>"
              />
            </label>
          )}

          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>{form.id ? 'Update Ad' : 'Create Ad'}</button>
            <button className="btn ghost" type="button" onClick={resetForm}>Clear</button>
          </div>
        </form>

        <div className="admin-ads-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Placement</th>
                <th>Size</th>
                <th>Type</th>
                <th>Active</th>
                <th>Order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedAds.map((ad) => (
                <tr key={ad.id}>
                  <td>{ad.placement}</td>
                  <td>{ad.size}</td>
                  <td>{ad.type}</td>
                  <td>{ad.active !== false ? 'Yes' : 'No'}</td>
                  <td>{ad.order ?? 0}</td>
                  <td className="table-actions">
                    <button onClick={() => startEdit(ad)}>Edit</button>
                    <button className="ghost" onClick={() => handleDelete(ad.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {sortedAds.length === 0 && !loading && (
                <tr>
                  <td colSpan={6}>No ads yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

