'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { buildApiUrl } from '@/lib/api'
import { dashboardForRole } from '@/lib/permissions'

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'VERIFICATION_AGENT' | 'ARTISAN' | null

interface AuthContextType {
  token: string | null
  role: UserRole
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ROLE_KEY = 'authRole'
const TOKEN_KEY = 'authToken'
const SESSION_TOKEN = 'session'

function persistRole(newRole: UserRole) {
  if (newRole) {
    localStorage.setItem(ROLE_KEY, newRole)
    localStorage.setItem(TOKEN_KEY, SESSION_TOKEN)
  } else {
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Keep initial render stable between server and client to avoid hydration mismatches.
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function hydrateSession() {
      const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null
      const storedToken = localStorage.getItem(TOKEN_KEY)

      if (storedRole && storedToken) {
        setRole(storedRole)
        setToken(storedToken)
        setIsAuthenticated(true)
      }

      try {
        const res = await fetch(buildApiUrl('/users/me'), { credentials: 'include' })

        if (cancelled) return

        if (res.ok) {
          const json = await res.json()
          const userRole = String(json?.data?.role ?? '').toUpperCase() as UserRole
          if (userRole) {
            persistRole(userRole)
            setRole(userRole)
            setToken(SESSION_TOKEN)
            setIsAuthenticated(true)
            return
          }
        }

        if (res.status === 401 || res.status === 403) {
          persistRole(null)
          setRole(null)
          setToken(null)
          setIsAuthenticated(false)
        }
      } catch {
        // Keep optimistic local session when the server is unreachable.
      } finally {
        if (!cancelled) setIsAuthLoading(false)
      }
    }

    hydrateSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = (newRole: UserRole) => {
    persistRole(newRole)
    setToken(SESSION_TOKEN)
    setRole(newRole)
    setIsAuthenticated(true)
    setIsAuthLoading(false)
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
      setIsAuthenticated(false)
      setIsAuthLoading(false)

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
    <AuthContext.Provider value={{ token, role, isAuthenticated, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

/** Redirect authenticated users away from login/register pages. */
export function useGuestRedirect() {
  const { isAuthenticated, isAuthLoading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !role) return
    router.replace(dashboardForRole(role))
  }, [isAuthenticated, isAuthLoading, role, router])

  return { isAuthLoading, isAuthenticated }
}
