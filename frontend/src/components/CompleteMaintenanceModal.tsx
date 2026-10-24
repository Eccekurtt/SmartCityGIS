import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useChangeMaintenanceStatus } from '../hooks/maintenance'
import type { MaintenanceRecord } from '../types'
import { Modal } from './Modal'

interface Props {
  record: MaintenanceRecord
  onClose: () => void
}

export function CompleteMaintenanceModal({ record, onClose }: Props) {
  const toast = useToast()
  const change = useChangeMaintenanceStatus()
  const [cost, setCost] = useState(record.cost != null ? String(record.cost) : '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await change.mutateAsync({ id: record.id, status: 'Completed', cost: cost === '' ? null : Number(cost) })
      toast.success('Bakım tamamlandı. Varlık durumu güncellendi.')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İşlem tamamlanamadı.')
    }
  }

  return (
    <Modal title="Bakımı tamamla" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <p className="form-context">
          <strong>{record.title}</strong> · {record.assetName}
        </p>
        <label>
          Gerçekleşen maliyet (₺)
          <input
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="isteğe bağlı"
            autoFocus
          />
        </label>
        <p className="field-hint">
          Başka devam eden bakımı yoksa varlık otomatik olarak "Aktif" duruma döner.
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={change.isPending}>
            Vazgeç
          </button>
          <button type="submit" className="btn primary" disabled={change.isPending}>
            {change.isPending ? 'Kaydediliyor...' : 'Tamamla'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
