import {
  maintenanceStatusColors,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
  priorityColors,
  priorityLabels,
} from '../labels'
import type { MaintenancePriority, MaintenanceRecord, MaintenanceStatus, MaintenanceType } from '../types'

export function MaintenanceStatusBadge({ record }: { record: Pick<MaintenanceRecord, 'status' | 'isOverdue'> }) {
  const status: MaintenanceStatus = record.status
  const color = record.isOverdue ? '#dc2626' : maintenanceStatusColors[status]

  return (
    <span className="status-pill" style={{ color, background: `${color}1f` }}>
      <span className="dot" style={{ background: color }} />
      {record.isOverdue ? 'Gecikmiş' : maintenanceStatusLabels[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return (
    <span className="priority" style={{ color: priorityColors[priority] }}>
      ▲ {priorityLabels[priority]}
    </span>
  )
}

export function TypeLabel({ type }: { type: MaintenanceType }) {
  return <span className="type-label">{maintenanceTypeLabels[type]}</span>
}
