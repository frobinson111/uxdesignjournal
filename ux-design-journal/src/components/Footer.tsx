import type { Category } from '../types'

interface Props {
  categories: Category[]
}

export function Footer({ categories }: Props) {
  const sectionCategories = categories.slice(0, 6)

  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">UX Design Journal</div>
            <ul className="footer-links">
              <li><a href="/about">About the Publication</a></li>
              <li><a href="/editorial">Editorial Principles</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Sections</h4>
            <ul className="footer-links">
              {sectionCategories.map((cat) => (
                <li key={cat.slug}><a href={`/${cat.slug}`}>{cat.name}</a></li>
              ))}
              <li><a href="/archive">Archive</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Most Read</h4>
            <ul className="footer-links">
              <li><a href="#">Before the Design Ships, Someone Has to Be Right</a></li>
              <li><a href="#">Senior UX Is Not About Creativity. It’s About Judgment.</a></li>
              <li><a href="#">Most Design Failures Are Political, Not Visual</a></li>
              <li><a href="#">The Long Middle of a Design Career</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Most Read</h4>
            <ul className="footer-links">
              <li><a href="#">Good Design Doesn’t Survive Bad Alignment</a></li>
              <li><a href="#">Defensible Design vs. Beautiful Work</a></li>
              <li><a href="#">AI Didn’t Change UX. Compliance Did.</a></li>
              <li><a href="#">When Staying an IC Becomes the Braver Choice</a></li>
            </ul>
          </div>
        </div>

        <div className="copyright">
          © {new Date().getFullYear()} UX Design Journal. All rights reserved.
        </div>
      </div>
    </footer>
  )
}


