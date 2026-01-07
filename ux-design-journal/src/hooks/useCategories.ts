import { useEffect, useState } from 'react'
import { fetchCategories } from '../api/public'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => console.error('Failed to load categories', err))
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}


