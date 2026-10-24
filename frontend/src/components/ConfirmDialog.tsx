import { useState } from 'react'
import { Modal } from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    await onConfirm()
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-message">{message}</p>
      <div className="form-actions">
        <button className="btn" onClick={onCancel} disabled={busy}>
          Vazgeç
        </button>
        <button className="btn danger-solid" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Siliniyor...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
