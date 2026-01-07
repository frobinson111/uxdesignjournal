import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { Article } from '../types'

interface Props {
  featured: Article[]
  tiles: Article[]
}

export function FeaturedGrid({ featured, tiles }: Props) {
  const list = useMemo(() => {
    const source = featured.length ? featured : tiles
    return source.slice(0, 6)
  }, [featured, tiles])
  const [index, setIndex] = useState(0)

  if (!list.length && !tiles.length) return null

  const slides = useMemo(() => {
    const chunks: Article[][] = []
    for (let i = 0; i < list.length; i += 2) {
      chunks.push(list.slice(i, i + 2))
    }
    return chunks
  }, [list])

  const currentSlide = slides[index] || []
  const prev = () => setIndex((i) => (slides.length ? (i - 1 + slides.length) % slides.length : 0))
  const next = () => setIndex((i) => (slides.length ? (i + 1) % slides.length : 0))

  return (
    <>
      <hr className="thick-rule" />
      <div className="featured-head">
        <h2>Featured Stories</h2>
        <Link className="readmore" to="/archive"><strong>View more posts</strong> <span>›</span></Link>
      </div>

      {!!list.length && (
        <section className="featured-carousel" aria-label="Featured stories">
          <div className="featured-slide">
            {currentSlide.map((item) => (
              <article className="feature-card" key={item.slug}>
                {(() => {
                  const img = item.imageUrl || `https://picsum.photos/seed/${item.slug}/600/360?grayscale`
                  return (
                    <div
                      className={`feature-img ${img ? 'has-img' : ''}`}
                      role="img"
                      aria-label={item.title}
                      style={{ backgroundImage: `url(${img})` }}
                    ></div>
                  )
                })()}
                <div className="feature-meta">
                  {typeof item.category === 'string' ? item.category : item.category?.name}
                </div>
                <h3 className="feature-title"><Link to={`/article/${item.slug}`}>{item.title}</Link></h3>
                {item.excerpt && <p className="feature-desc">{item.excerpt}</p>}
              </article>
            ))}
          </div>
          <div className="featured-controls">
            <button onClick={prev} aria-label="Previous featured story" disabled={slides.length <= 1}>‹</button>
            <div className="featured-dots">
              {slides.map((_item, i) => (
                <button
                  key={`dot-${i}`}
                  className={i === index ? 'active' : ''}
                  aria-label={`Go to featured group ${i + 1}`}
                  onClick={() => setIndex(i)}
                  disabled={slides.length <= 1}
                />
              ))}
            </div>
            <button onClick={next} aria-label="Next featured story" disabled={slides.length <= 1}>›</button>
          </div>
        </section>
      )}

      <section className="tiles" aria-label="More featured stories">
        {tiles.map((item) => (
          <article className="tile" key={item.slug}>
            <div
              className={`tile-img ${item.imageUrl ? 'has-img' : ''}`}
              role="img"
              aria-label={item.title}
              style={{ backgroundImage: `url(${item.imageUrl || `https://picsum.photos/seed/${item.slug}-tile/400/280?grayscale`})` }}
            ></div>
            <div className="meta">{typeof item.category === 'string' ? item.category : item.category?.name}</div>
            <h4 className="t"><Link to={`/article/${item.slug}`}>{item.title}</Link></h4>
            {item.excerpt && <p className="d">{item.excerpt}</p>}
          </article>
        ))}
      </section>
    </>
  )
}

