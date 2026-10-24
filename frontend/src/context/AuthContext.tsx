import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getMe, login as loginRequest } from '../api/auth'
import { setUnauthorizedHandler, tokenStore } from '../api/client'
import type { SessionUser } from '../types'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthApi {
  user: SessionUser | null
  status: Status
  login: (userName: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokenStore.get() ? 'loading' : 'anonymous'))

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
    // Önceki kullanıcının yetkisiyle çekilmiş verilerin bir sonraki oturuma sızmaması için önbellek temizlenir.
    queryClient.clear()
  }, [queryClient])

  // Sunucu 401 dönerse (token süresi dolmuş/iptal) oturumu kapat.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Sayfa yenilenince token hâlâ geçerli mi diye sor.
  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false

    getMe()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) logout()
      })

    return () => {
      cancelled = true
    }
  }, [logout])

  const login = useCallback(async (userName: string, password: string) => {
    const response = await loginRequest(userName, password)
    tokenStore.set(response.token)
    setUser(response.user)
    setStatus('authenticated')
  }, [])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthApi {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.')
  return context
}
