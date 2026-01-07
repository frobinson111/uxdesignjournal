import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { adminLogin } from '../api/admin'

interface AuthState {
  isAuthed: boolean
  email: string | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'uxdj_admin_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ isAuthed: false, email: null, token: null })

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthState
        setState(parsed)
      } catch {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await adminLogin(email, password)
      const next = { isAuthed: true, email: res.user.email, token: res.token }
      setState(next)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return true
    } catch (err) {
      console.error('Admin login failed', err)
      return false
    }
  }

  const logout = () => {
    setState({ isAuthed: false, email: null, token: null })
    sessionStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo<AuthContextValue>(() => ({ ...state, login, logout }), [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

