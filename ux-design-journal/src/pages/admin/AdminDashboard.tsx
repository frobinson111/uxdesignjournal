import { useEffect, useState } from 'react'
import { adminGetStats } from '../../api/admin'
import type { AdminStats } from '../../types'
import { useAuth } from '../../auth/AuthContext'
import { Link } from 'react-router-dom'

export function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    adminGetStats(token)
      .then(setStats)
      .catch((err) => {
        console.error(err)
        setError('Could not load dashboard stats.')
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="admin-pane"><p>Loading dashboard…</p></div>
  if (error) return <div className="admin-pane"><p className="error">{error}</p></div>
  if (!stats) return null

  const cards = [
    { label: 'Subscribers', value: stats.subscribers, trend: stats.trends.subscribers, link: '/admin/users' },
    { label: 'Articles', value: stats.articles, trend: stats.trends.articles, link: '/admin/articles' },
    { label: 'Categories', value: stats.categories, trend: null, link: null },
    { label: 'Ads', value: stats.ads, trend: null, link: '/admin/ads' },
    { label: 'Admins', value: stats.admins, trend: null, link: null },
    { label: 'Recent Events', value: stats.recentEvents.length, trend: null, link: null },
  ]

  const getTrendPercent = (trend: { current: number; previous: number } | null) => {
    if (!trend || trend.previous === 0) return null
    return ((trend.current - trend.previous) / trend.previous) * 100
  }

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        {cards.map((card) => {
          const trendPercent = getTrendPercent(card.trend)
          const CardWrapper = card.link ? Link : 'div'
          const wrapperProps = card.link ? { to: card.link, className: 'stat-card clickable' } : { className: 'stat-card' }

          return (
            <CardWrapper key={card.label} {...wrapperProps}>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value">{card.value}</div>
              {trendPercent !== null && (
                <div className={`stat-trend ${trendPercent >= 0 ? 'positive' : 'negative'}`}>
                  <span className="trend-icon">{trendPercent >= 0 ? '↑' : '↓'}</span>
                  <span className="trend-percent">{Math.abs(trendPercent).toFixed(1)}%</span>
                  <span className="trend-label">vs last 7 days</span>
                </div>
              )}
              {card.trend && (
                <div className="sparkline">
                  <div
                    className="spark-bar"
                    style={{
                      width: card.trend.previous > 0 ? `${(card.trend.previous / Math.max(card.trend.current, card.trend.previous)) * 100}%` : '0%',
                    }}
                  />
                  <div
                    className="spark-bar current"
                    style={{
                      width: card.trend.current > 0 ? `${(card.trend.current / Math.max(card.trend.current, card.trend.previous)) * 100}%` : '0%',
                    }}
                  />
                </div>
              )}
            </CardWrapper>
          )
        })}
      </div>

      <div className="recent-section">
        <h2>Recent Activity</h2>
        <ul className="recent-list">
          {stats.recentEvents.map((event, idx) => (
            <li key={`${event.type}-${event.slug || event.email || idx}`} className="recent-item">
              {event.type === 'article' && (
                <>
                  <span className="event-type">Article</span>
                  <Link to={`/admin/articles/${event.slug}`} className="event-title">{event.title}</Link>
                  <span className="event-date">{new Date(event.date).toLocaleDateString()}</span>
                </>
              )}
              {event.type === 'subscriber' && (
                <>
                  <span className="event-type">Subscriber</span>
                  <span className="event-title">{event.email}</span>
                  <span className="event-date">{new Date(event.date).toLocaleDateString()}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

