import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Toast } from '../components/Toast'
import type { ToastMessage } from '../components/Toast'

interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismiss = useCallback(() => setToast(null), [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => setToast({ type: 'success', text }),
      error: (text) => setToast({ type: 'error', text }),
    }),
    [],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && <Toast toast={toast} onDismiss={dismiss} />}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast, ToastProvider içinde kullanılmalıdır.')
  return context
}
