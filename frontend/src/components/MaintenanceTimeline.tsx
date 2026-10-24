import { useState } from 'react'
import { useAssetMaintenance } from '../hooks/maintenance'
import { formatCurrency, formatDate } from '../lib/format'
import { MaintenanceActions } from './MaintenanceActions'
import { MaintenanceFormModal } from './MaintenanceFormModal'
import { MaintenanceStatusBadge, PriorityBadge, TypeLabel } from './MaintenanceBadges'
import { PlusIcon } from './icons'

interface Props {
  assetId: number
  assetName: string
  canEdit: boolean
  canDelete: boolean
}

// Bir varlığın bakım geçmişini zaman çizelgesi olarak gösterir ve yeni bakım planlamayı sağlar.
export function MaintenanceTimeline({ assetId, assetName, canEdit, canDelete }: Props) {
  const { data, isLoading, error } = useAssetMaintenance(assetId)
  const [creating, setCreating] = useState(false)

  return (
    <div className="timeline-wrap">
      <div className="timeline-head">
        <span>{data ? `${data.length} kayıt` : ''}</span>
        {canEdit && (
          <button className="btn small primary" onClick={() => setCreating(true)}>
            <PlusIcon size={14} /> Bakım planla
          </button>
        )}
      </div>

      {isLoading && <div className="skeleton skeleton-row" />}
      {error && <p className="form-error">{error.message}</p>}
      {data && data.length === 0 && (
        <p className="empty-note">Bu varlık için henüz bakım kaydı yok.</p>
      )}

      <ol className="timeline">
        {data?.map((record) => (
          <li key={record.id} className={`timeline-item st-${record.status}${record.isOverdue ? ' overdue' : ''}`}>
            <div className="timeline-top">
              <strong>{record.title}</strong>
              <MaintenanceStatusBadge record={record} />
            </div>
            <div className="timeline-meta">
              <TypeLabel type={record.type} />
              <PriorityBadge priority={record.priority} />
              <span>{formatDate(record.scheduledDate)}</span>
              {record.technician && <span>{record.technician}</span>}
              {record.cost != null && <span>{formatCurrency(record.cost)}</span>}
            </div>
            {record.description && <p className="timeline-desc">{record.description}</p>}
            <MaintenanceActions record={record} canEdit={canEdit} canDelete={canDelete} />
          </li>
        ))}
      </ol>

      {creating && (
        <MaintenanceFormModal assetId={assetId} assetName={assetName} record={null} onClose={() => setCreating(false)} />
      )}
    </div>
  )
}
