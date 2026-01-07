import { useEffect, useState } from 'react'
import { fetchHomepage } from '../api/public'
import type { HomepagePayload } from '../types'
import { ArticleList } from '../components/ArticleList'
import { LeadStory } from '../components/LeadStory'
import { DailyFeed } from '../components/DailyFeed'
import { FeaturedGrid } from '../components/FeaturedGrid'
import { NewsletterForm } from '../components/NewsletterForm'

export function HomePage() {
  const [data, setData] = useState<HomepagePayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHomepage()
      .then(setData)
      .catch((err) => {
        console.error(err)
        setError('Could not load homepage right now.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="wrap section">Loading homepage…</div>
  }

  if (error) {
    return <div className="wrap section error">{error}</div>
  }

  if (!data) return null

  return (
    <div className="wrap section">
      <div className="grid-top">
        <aside className="panel" aria-label="Latest articles">
          <h3>Latest Articles</h3>
          <ArticleList items={data.latest} variant="headline" />
        </aside>

        <LeadStory story={data.lead} />

        <DailyFeed items={data.daily} />
      </div>

      <FeaturedGrid featured={data.featured} tiles={data.tiles} />
      <NewsletterForm />
    </div>
  )
}


