import { useAsset } from '../hooks/assets'
import type { AssetInput } from '../types'
import { AssetForm } from './AssetForm'
import { Modal } from './Modal'

interface Props {
  // null = yeni kayıt, sayı = o kaydı düzenle (geometrisiyle birlikte sunucudan çekilir)
  editId: number | null
  onSubmit: (input: AssetInput) => Promise<void>
  onClose: () => void
}

export function AssetFormModal({ editId, onSubmit, onClose }: Props) {
  const { data: asset, isLoading, error } = useAsset(editId)

  return (
    <Modal title={editId === null ? 'Yeni Varlık' : 'Varlığı Düzenle'} variant="wide" onClose={onClose}>
      {editId !== null && isLoading && <div className="skeleton skeleton-row" />}
      {error && <p className="form-error">{error.message}</p>}
      {(editId === null || asset) && (
        <AssetForm key={editId ?? 'new'} asset={asset ?? null} onSubmit={onSubmit} onCancel={onClose} />
      )}
    </Modal>
  )
}
