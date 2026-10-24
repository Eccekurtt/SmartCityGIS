import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useCreateMaintenance, useUpdateMaintenance } from '../hooks/maintenance'
import { maintenanceTypeLabels, maintenanceTypes, priorities, priorityLabels } from '../labels'
import type { MaintenanceInput, MaintenancePriority, MaintenanceRecord, MaintenanceType } from '../types'
import { Modal } from './Modal'

interface Props {
  assetId: number
  assetName: string
  record: MaintenanceRecord | null // null = yeni bakım planla
  onClose: () => void
}

const todayIso = () => new Date().toLocaleDateString('sv-SE') // yyyy-MM-dd, yerel saat

export function MaintenanceFormModal({ assetId, assetName, record, onClose }: Props) {
  const toast = useToast()
  const create = useCreateMaintenance()
  const update = useUpdateMaintenance()

  const [title, setTitle] = useState(record?.title ?? '')
  const [type, setType] = useState<MaintenanceType>(record?.type ?? 'Routine')
  const [priority, setPriority] = useState<MaintenancePriority>(record?.priority ?? 'Normal')
  const [scheduledDate, setScheduledDate] = useState(record?.scheduledDate ?? todayIso())
  const [technician, setTechnician] = useState(record?.technician ?? '')
  const [cost, setCost] = useState(record?.cost != null ? String(record.cost) : '')
  const [description, setDescription] = useState(record?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  const saving = create.isPending || update.isPending

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const input: MaintenanceInput = {
      title: title.trim(),
      type,
      priority,
      scheduledDate,
      technician: technician.trim() || null,
      cost: cost === '' ? null : Number(cost),
      description: description.trim() || null,
    }

    try {
      if (record) {
        await update.mutateAsync({ id: record.id, input })
        toast.success('Bakım kaydı güncellendi.')
      } else {
        await create.mutateAsync({ assetId, input })
        toast.success('Bakım planlandı.')
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilirken bir hata oluştu.')
    }
  }

  return (
    <Modal title={record ? 'Bakımı düzenle' : 'Bakım planla'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <p className="form-context">
          Varlık: <strong>{assetName}</strong>
        </p>

        <label>
          Başlık
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required autoFocus />
        </label>

        <div className="row">
          <label>
            Tür
            <select value={type} onChange={(e) => setType(e.target.value as MaintenanceType)}>
              {maintenanceTypes.map((value) => (
                <option key={value} value={value}>
                  {maintenanceTypeLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Öncelik
            <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)}>
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {priorityLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row">
          <label>
            Planlanan tarih
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
          </label>
          <label>
            Tahmini maliyet (₺)
            <input
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="isteğe bağlı"
            />
          </label>
        </div>

        <label>
          Teknisyen / ekip
          <input value={technician} onChange={(e) => setTechnician(e.target.value)} maxLength={100} />
        </label>

        <label>
          Açıklama
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Vazgeç
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
