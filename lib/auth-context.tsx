'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'VERIFICATION_AGENT' | 'ARTISAN' | null

interface AuthContextType {
  token: string | null
  role: UserRole
  login: (role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ROLE_KEY = 'authRole'
const TOKEN_KEY = 'authToken'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const router = useRouter()

  // Rehydrate from localStorage on first mount (client-only)
  useEffect(() => {
    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null
    if (storedRole) setRole(storedRole)
  }, [])

  const login = (newRole: UserRole) => {
    localStorage.setItem(ROLE_KEY, newRole ?? '')
    setToken(null)
    setRole(newRole)
  }

  const logout = async () => {
    // Attempt server-side logout, but always clear local client state afterwards.
    try {
      const base = (process.env.NEXT_PUBLIC_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api/v1'
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    } catch (err) {
      // swallow network errors — still clear local state to avoid stale sessions
      console.warn('Logout request failed:', err)
    } finally {
      // Clear any client-side auth artifacts
      try {
        localStorage.removeItem(ROLE_KEY)
        localStorage.removeItem(TOKEN_KEY)
      } catch (e) {
        // localStorage may be unavailable in some environments
      }

      setToken(null)
      setRole(null)

      // Redirect to login page
      try {
        router.push('/auth/login')
      } catch (e) {
        // Fallback to full navigation
        if (typeof window !== 'undefined') window.location.href = '/auth/login'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
