import type { Article } from '../types'
import { Link } from 'react-router-dom'

interface Props {
  items: Article[]
  variant?: 'headline' | 'excerpt'
  title?: string
}

export function ArticleList({ items, variant = 'headline', title }: Props) {
  if (!items.length) return null

  return (
    <div className="article-list">
      {title && <h3 className="list-title">{title}</h3>}
      <ol className={variant === 'headline' ? 'latest-list' : 'article-rows'}>
        {items.map((item) => {
          const to = `/article/${item.slug}`
          if (variant === 'headline') {
            return (
              <li key={item.slug}>
                <Link to={to}>{item.title}</Link>
              </li>
            )
          }
          return (
            <li key={item.slug} className="article-row">
              <div className="meta-row">
                <span className="meta-cat">{typeof item.category === 'string' ? item.category : item.category.name}</span>
                {item.date && <span className="meta-date">{item.date}</span>}
              </div>
              <h3><Link to={to}>{item.title}</Link></h3>
              {item.excerpt && <p>{item.excerpt}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}


