import { NavLink } from 'react-router-dom'
import type { Category } from '../types'

interface Props {
  categories: Category[]
}

const pinned: Category[] = [
  { slug: '', name: 'Home', pinned: true },
  { slug: 'archive', name: 'Archive', pinned: true },
  { slug: 'subscribe', name: 'Subscribe', pinned: true },
]

export function PrimaryNav({ categories }: Props) {
  const merged = [...pinned, ...categories.filter((c) => !pinned.find((p) => p.slug === c.slug))]

  return (
    <nav className="primary-nav" aria-label="Primary">
      <div className="wrap">
        <ul>
          {merged.map((item) => {
            const to = item.slug === '' ? '/' : `/${item.slug}`
            return (
              <li key={item.slug}>
                <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  {item.name}
                </NavLink>
              </li>
            )
          })}
          <li aria-label="Search">
            <NavLink to="/search" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Search
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}


