import { Link } from 'react-router-dom'
import type { Article } from '../types'

interface Props {
  story: Article | null
}

export function LeadStory({ story }: Props) {
  if (!story) return null

  const img = story.imageUrl || `https://picsum.photos/seed/${story.slug || 'lead'}/900/520?grayscale`
  const heroStyle = story.imageUrl ? { backgroundImage: `url(${story.imageUrl})` } : undefined
  const style = story.imageUrl ? heroStyle : { backgroundImage: `url(${img})` }

  return (
    <section className="lead" aria-label="Lead story">
      <div
        className={`hero-img ${story.imageUrl ? 'has-img' : ''}`}
        role="img"
        aria-label={story.title}
        style={style}
      ></div>
      <div className="kicker">
        {typeof story.category === 'string' ? story.category : story.category?.name}
        {story.date ? <> · <span>{story.date}</span></> : null}
      </div>
      <h1><Link to={`/article/${story.slug}`}>{story.title}</Link></h1>
      {story.excerpt && <p>{story.excerpt}</p>}
      <Link className="readmore" to={`/article/${story.slug}`}><strong>Read More</strong> <span>›</span></Link>
    </section>
  )
}

