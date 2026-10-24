import { useEffect } from 'react'

export interface ToastMessage {
  type: 'success' | 'error'
  text: string
}

interface Props {
  toast: ToastMessage
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div className={`toast toast-${toast.type}`} role="status">
      {toast.text}
    </div>
  )
}
