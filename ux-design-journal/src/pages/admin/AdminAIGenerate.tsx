import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminGenerateAI } from '../../api/admin'
import { useAuth } from '../../auth/AuthContext'
import { useCategories } from '../../hooks/useCategories'

export function AdminAIGenerate() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { categories } = useCategories()
  const [category, setCategory] = useState('practice')
  const [sourceUrl, setSourceUrl] = useState('')
  const [mode, setMode] = useState<'rewrite' | 'from-scratch'>('rewrite')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (categories.length && (!category || !categories.find((c) => c.slug === category))) {
      setCategory(categories[0].slug)
    }
  }, [categories, category])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Not authenticated.')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const res = await adminGenerateAI(token, { category, sourceUrl: sourceUrl || undefined, mode })
      navigate(`/admin/articles/${res.slug}`)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setError('AI generation failed.')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Generate with AI</h1>
      </div>
      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Category slug
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.slug}</option>
            ))}
          </select>
        </label>
        <label>
          Source URL (optional for rewrite)
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://example.com/article" />
        </label>
        <label className="row">
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'rewrite' | 'from-scratch')}>
            <option value="rewrite">Rewrite</option>
            <option value="from-scratch">From scratch</option>
          </select>
        </label>
        {error && <div className="form-note error">{error}</div>}
        <div className="form-actions">
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Generating…' : 'Generate Draft'}
          </button>
        </div>
      </form>
      <p className="muted">AI drafts save as status=draft. Review and publish from the editor.</p>
    </div>
  )
}

