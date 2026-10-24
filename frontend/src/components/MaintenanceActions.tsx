import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useChangeMaintenanceStatus, useDeleteMaintenance } from '../hooks/maintenance'
import type { MaintenanceRecord } from '../types'
import { CompleteMaintenanceModal } from './CompleteMaintenanceModal'
import { ConfirmDialog } from './ConfirmDialog'
import { MaintenanceFormModal } from './MaintenanceFormModal'

interface Props {
  record: MaintenanceRecord
  canEdit: boolean
  canDelete: boolean
}

// Bir bakım kaydının durumuna uygun işlem düğmeleri (başlat / tamamla / düzenle / iptal / sil) ve pencereleri.
export function MaintenanceActions({ record, canEdit, canDelete }: Props) {
  const toast = useToast()
  const change = useChangeMaintenanceStatus()
  const remove = useDeleteMaintenance()

  const [dialog, setDialog] = useState<null | 'edit' | 'complete' | 'cancel' | 'delete'>(null)
  const close = () => setDialog(null)

  const open = record.status === 'Planned' || record.status === 'InProgress'

  async function transition(status: 'InProgress' | 'Cancelled', message: string) {
    try {
      await change.mutateAsync({ id: record.id, status })
      toast.success(message)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      close()
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(record.id)
      toast.success('Bakım kaydı silindi.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      close()
    }
  }

  return (
    <>
      <div className="maint-actions">
        {canEdit && record.status === 'Planned' && (
          <button className="btn small" onClick={() => transition('InProgress', 'Bakım başlatıldı. Varlık "Bakımda" olarak işaretlendi.')} disabled={change.isPending}>
            Başlat
          </button>
        )}
        {canEdit && record.status === 'InProgress' && (
          <button className="btn small primary" onClick={() => setDialog('complete')}>
            Tamamla
          </button>
        )}
        {canEdit && open && (
          <button className="btn small" onClick={() => setDialog('edit')}>
            Düzenle
          </button>
        )}
        {canEdit && open && (
          <button className="btn small" onClick={() => setDialog('cancel')}>
            İptal et
          </button>
        )}
        {canDelete && (
          <button className="btn small danger-outline" onClick={() => setDialog('delete')}>
            Sil
          </button>
        )}
      </div>

      {dialog === 'edit' && (
        <MaintenanceFormModal assetId={record.assetId} assetName={record.assetName} record={record} onClose={close} />
      )}
      {dialog === 'complete' && <CompleteMaintenanceModal record={record} onClose={close} />}
      {dialog === 'cancel' && (
        <ConfirmDialog
          title="Bakımı iptal et"
          message={`"${record.title}" bakımı iptal edilecek.`}
          confirmLabel="İptal et"
          onConfirm={() => transition('Cancelled', 'Bakım iptal edildi.')}
          onCancel={close}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title="Bakım kaydını sil"
          message={`"${record.title}" kaydı kalıcı olarak silinecek.`}
          confirmLabel="Sil"
          onConfirm={handleDelete}
          onCancel={close}
        />
      )}
    </>
  )
}
