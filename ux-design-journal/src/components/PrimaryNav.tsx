import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { Category } from '../types'

interface Props {
  categories: Category[]
}

export function PrimaryNav({ categories }: Props) {
  const [open, setOpen] = useState(false)
  const categoriesBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]))

  const desiredOrder = ['', 'practice', 'design-reviews', 'career', 'signals', 'journal', 'editorial']
  const merged = desiredOrder
    .map((slug) => {
      if (slug === '') return { slug, name: 'Home' } satisfies Category
      if (slug === 'editorial') return { slug, name: 'Editorial' } satisfies Category
      const match = categoriesBySlug[slug]
      return match
    })
    .filter(Boolean) as Category[]

  const toggle = () => setOpen((v) => !v)
  const close = () => setOpen(false)

  return (
    <nav className="primary-nav" aria-label="Primary">
      <div className="wrap nav-inner">
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={toggle}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className={open ? 'open' : undefined} onClick={close}>
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
        </ul>
      </div>
    </nav>
  )
}


