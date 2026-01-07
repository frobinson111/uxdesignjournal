import { useMemo } from 'react'

export function UtilityBar() {
  const formattedDate = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }, [])

  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <div className="topbar-left" aria-label="Current date">
          {formattedDate}
        </div>
        <div className="topbar-right" aria-label="Utility navigation">
          <a href="/">Home</a>
          <a href="/editorial">Editorial</a>
          <a href="/contact">Contact</a>
          <button className="icon-btn" aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="#111" strokeWidth="2"></circle>
              <path d="M20 20L17 17" stroke="#111" strokeWidth="2" strokeLinecap="round"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

