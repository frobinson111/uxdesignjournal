import { Link } from 'react-router-dom'
import type { Article } from '../types'

interface Props {
  items: Article[]
  title?: string
}

export function DailyFeed({ items, title = 'Daily Feed' }: Props) {
  if (!items.length) return null

  return (
    <aside className="sidebar" aria-label={title}>
      <h2>{title}</h2>
      <div className="feed">
        {items.map((item) => (
          <div className="feed-item" key={item.slug}>
            <div className="cat">
              {typeof item.category === 'string' ? item.category : item.category?.name}
            </div>
            <p className="title"><Link to={`/article/${item.slug}`}>{item.title}</Link></p>
            {item.excerpt && <p className="desc">{item.excerpt}</p>}
            <Link className="tiny-link" to={`/article/${item.slug}`}>Read more</Link>
          </div>
        ))}
      </div>
    </aside>
  )
}


