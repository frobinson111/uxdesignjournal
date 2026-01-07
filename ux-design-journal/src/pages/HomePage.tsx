import { useEffect, useState } from 'react'
import { fetchHomepage } from '../api/public'
import type { HomepagePayload } from '../types'
import { ArticleList } from '../components/ArticleList'
import { LeadStory } from '../components/LeadStory'
import { DailyFeed } from '../components/DailyFeed'
import { FeaturedGrid } from '../components/FeaturedGrid'
import { NewsletterForm } from '../components/NewsletterForm'
import { AdSlotRenderer } from '../components/AdSlotRenderer'

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

  const pickOne = <T,>(arr: T[] = []) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined)

  const latestAdSlot = pickOne(data.ads?.sidebar) || {
    id: 'home-latest-placeholder',
    type: 'IMAGE_LINK',
    imageUrl: 'https://via.placeholder.com/300x600?text=Ad+300x600',
    href: '#',
    label: 'Advertisement',
    alt: '300x600 ad',
  }

  const leadAdSlot = pickOne(data.ads?.inline) || {
    id: 'home-lead-placeholder',
    type: 'IMAGE_LINK',
    imageUrl: 'https://via.placeholder.com/728x250?text=Ad+728x250',
    href: '#',
    label: 'Advertisement',
    alt: '728x250 ad',
  }

  return (
    <div className="wrap section">
      <div className="grid-top">
        <aside className="panel" aria-label="Latest articles">
          <h3>Latest Articles</h3>
          <ArticleList items={data.latest} variant="headline" />
          <div className="ad-block">
            <AdSlotRenderer slot={latestAdSlot} placement="inline" size="300x600" />
          </div>
        </aside>

        <div>
          <LeadStory story={data.lead} />
          <div className="ad-block">
            <AdSlotRenderer slot={leadAdSlot} placement="inline" size="728x250" />
          </div>
        </div>

        <DailyFeed items={data.daily} />
      </div>

      <FeaturedGrid featured={data.featured} tiles={data.tiles} />
      <NewsletterForm />
    </div>
  )
}


