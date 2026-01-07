import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminGetArticle, adminSaveArticle, adminUploadImage, adminRegenerateImage } from '../../api/admin'
import type { ArticlePayload } from '../../types'
import { useAuth } from '../../auth/AuthContext'

export function AdminArticleEdit() {
  const { slug } = useParams()
  const isNew = slug === 'new'
  const navigate = useNavigate()
  const { token } = useAuth()
  const blankArticle: ArticlePayload = {
    slug: '',
    title: '',
    category: 'practice',
    excerpt: '',
    bodyMarkdown: '',
    status: 'draft',
    featured: false,
    featureOrder: 0,
  }

  const [data, setData] = useState<ArticlePayload | null>(isNew ? blankArticle : null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [regenning, setRegenning] = useState(false)

  useEffect(() => {
    if (isNew) {
      setData(blankArticle)
      setLoading(false)
      return
    }
    if (!token) return
    setLoading(true)
    adminGetArticle(token, slug || '')
      .then(setData)
      .catch((err) => {
        console.error(err)
        setError('Unable to load article.')
      })
      .finally(() => setLoading(false))
  }, [isNew, slug, token])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!data) return
    if (!token) {
      setError('Not authenticated.')
      return
    }
    setSaving(true)
    try {
      await adminSaveArticle(token, data)
      navigate('/admin/articles')
    } catch (err) {
      console.error(err)
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof ArticlePayload, value: string | boolean | number) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const onUpload = async (file?: File | null) => {
    if (!file || !token) return
    setUploading(true)
    try {
      const res = await adminUploadImage(token, file)
      update('imageUrl', res.url)
    } catch (err) {
      console.error(err)
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const onRegenImage = async () => {
    if (!token || !data?.slug) {
      setError('Save the article first to regenerate image.')
      return
    }
    setRegenning(true)
    try {
      const res = await adminRegenerateImage(token, data.slug)
      if (!res.imageUrl) {
        setError('Image regeneration returned no image.')
      } else {
        update('imageUrl', res.imageUrl)
      }
    } catch (err) {
      console.error(err)
      setError('Image regeneration failed.')
    } finally {
      setRegenning(false)
    }
  }

  if (loading) return <p>Loading…</p>
  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="error">No article loaded.</p>

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>{isNew ? 'New Article' : 'Edit Article'}</h1>
        <div className="muted">Slug: {data.slug || '(draft)'}</div>
      </div>
      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Title
          <input value={data.title} onChange={(e) => update('title', e.target.value)} required />
        </label>
        <label>
          Slug
          <input value={data.slug} onChange={(e) => update('slug', e.target.value)} placeholder="auto-generated" />
        </label>
        <label>
          Category
          <input
            value={typeof data.category === 'string' ? (data.category || '') : (data.category?.slug || '')}
            onChange={(e) => update('category', e.target.value)}
            required
          />
        </label>
        <label>
          Excerpt
          <textarea value={data.excerpt || ''} onChange={(e) => update('excerpt', e.target.value)} rows={3} />
        </label>
        <label>
          Hero image URL
          <input value={data.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…" />
        </label>
        <div className="img-preview">
          {data.imageUrl ? <div className="img-thumb" style={{ backgroundImage: `url(${data.imageUrl})` }}></div> : <div className="muted">No image yet</div>}
          <div className="form-actions">
            <label className="btn" style={{ cursor: 'pointer' }}>
              Upload
              <input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])} style={{ display: 'none' }} />
            </label>
            <button type="button" onClick={onRegenImage} disabled={regenning || isNew}>
              {regenning ? 'Regenerating…' : 'Regenerate AI image'}
            </button>
            {uploading && <span className="muted">Uploading…</span>}
          </div>
        </div>
        <label className="row">
          <span>Status</span>
          <select value={data.status || 'draft'} onChange={(e) => update('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label>
          Publish at (ISO)
          <input type="datetime-local" value={data.publishAt || ''} onChange={(e) => update('publishAt', e.target.value)} />
        </label>
        <label className="row">
          <span>Featured</span>
          <input type="checkbox" checked={Boolean(data.featured)} onChange={(e) => update('featured', e.target.checked)} />
        </label>
        <label>
          Feature Order
          <input type="number" value={data.featureOrder || 0} onChange={(e) => update('featureOrder', Number(e.target.value))} />
        </label>
        <label>
          Body (Markdown)
          <textarea value={data.bodyMarkdown || data.bodyHtml || ''} onChange={(e) => update('bodyMarkdown', e.target.value)} rows={14} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="ghost" onClick={() => navigate('/admin/articles')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

