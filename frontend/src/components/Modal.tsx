import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { XIcon } from './icons'

interface Props {
  title: string
  onClose: () => void
  // center: küçük ortalı pencere, wide: geniş form penceresi, drawer: sağdan açılan panel
  variant?: 'center' | 'wide' | 'drawer'
  children: ReactNode
}

// Tarayıcının yerleşik <dialog> öğesini kullanır: Esc ile kapanma, odak yönetimi
// ve arka planı karartma tarayıcı tarafından sağlanır.
export function Modal({ title, onClose, variant = 'center', children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialog.current
    // StrictMode geliştirmede efekti iki kez çalıştırır; açık dialog'u tekrar açmak hata verir.
    if (el && !el.open) el.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className={`modal modal-${variant}`}
      onClose={onClose}
      // Dialog'un kendisine (yani karartılmış arka plana) tıklanırsa kapat.
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close()
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Kapat" onClick={() => dialog.current?.close()}>
          <XIcon size={18} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
