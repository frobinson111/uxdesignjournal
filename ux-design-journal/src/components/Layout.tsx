import type { ReactNode } from 'react'
import { UtilityBar } from './UtilityBar'
import { Masthead } from './Masthead'
import { PrimaryNav } from './PrimaryNav'
import type { Category } from '../types'
import { Footer } from './Footer'

interface Props {
  categories: Category[]
  children: ReactNode
}

export function Layout({ categories, children }: Props) {
  return (
    <div className="page">
      <UtilityBar />
      <Masthead />
      <PrimaryNav categories={categories} />
      <main>
        {children}
      </main>
      <Footer categories={categories} />
    </div>
  )
}

