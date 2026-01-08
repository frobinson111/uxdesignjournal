import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function UtilityBar() {
  const navigate = useNavigate()
  const formattedDate = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }, [])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(trimmed)}&page=1`)
  }

  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <div className="topbar-left" aria-label="Current date">
          {formattedDate}
        </div>
        <div className="topbar-right" aria-label="Utility navigation">
          <Link to="/subscribe">Subscribe</Link>

          <div className="topbar-search">
            {open && (
              <form onSubmit={onSubmit} aria-label="Search articles">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  autoFocus
                />
              </form>
            )}
            <button
              className="icon-btn"
              aria-label="Search"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              type="button"
            >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="#111" strokeWidth="2"></circle>
              <path d="M20 20L17 17" stroke="#111" strokeWidth="2" strokeLinecap="round"></path>
            </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

