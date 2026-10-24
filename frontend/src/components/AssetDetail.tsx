import { categoryColors, categoryLabels, geometryLabels, statusLabels } from '../labels'
import { formatArea, formatDateTime, formatLength } from '../lib/format'
import { useAsset } from '../hooks/assets'
import { EditIcon, PinIcon, TrashIcon } from './icons'
import { Modal } from './Modal'

interface Props {
  id: number
  onClose: () => void
  onShowOnMap: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number, name: string) => void
  canEdit: boolean
  canDelete: boolean
}

export function AssetDetail({ id, onClose, onShowOnMap, onEdit, onDelete, canEdit, canDelete }: Props) {
  const { data: asset, isLoading, error } = useAsset(id)

  return (
    <Modal title="Varlık ayrıntıları" variant="drawer" onClose={onClose}>
      {isLoading && <div className="skeleton skeleton-row" />}
      {error && <p className="form-error">{error.message}</p>}

      {asset && (
        <div className="detail">
          <div className="detail-head">
            <h3>{asset.name}</h3>
            <div className="detail-tags">
              <span className="chip">
                <span className="dot" style={{ background: categoryColors[asset.category] }} />
                {categoryLabels[asset.category]}
              </span>
              <span className={`badge badge-${asset.status}`}>{statusLabels[asset.status]}</span>
            </div>
          </div>

          {asset.description && <p className="detail-description">{asset.description}</p>}

          <dl className="facts">
            <div>
              <dt>Geometri</dt>
              <dd>{geometryLabels[asset.geometryType] ?? asset.geometryType}</dd>
            </div>
            <div>
              <dt>{asset.areaSquareMeters != null ? 'Alan' : 'Uzunluk'}</dt>
              <dd>
                {asset.areaSquareMeters != null
                  ? formatArea(asset.areaSquareMeters)
                  : asset.lengthMeters != null
                    ? formatLength(asset.lengthMeters)
                    : '—'}
              </dd>
            </div>
            <div>
              <dt>Mahalle</dt>
              <dd>{asset.neighborhood}</dd>
            </div>
            <div>
              <dt>Konum (merkez)</dt>
              <dd className="cell-mono">
                {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
              </dd>
            </div>
            <div>
              <dt>Oluşturulma</dt>
              <dd>{formatDateTime(asset.createdAt)}</dd>
            </div>
            <div>
              <dt>Son güncelleme</dt>
              <dd>{formatDateTime(asset.updatedAt)}</dd>
            </div>
          </dl>

          <div className="detail-actions">
            <button className="btn" onClick={() => onShowOnMap(asset.id)}>
              <PinIcon size={16} /> Haritada göster
            </button>
            {canEdit && (
              <button className="btn" onClick={() => onEdit(asset.id)}>
                <EditIcon size={16} /> Düzenle
              </button>
            )}
            {canDelete && (
              <button className="btn danger-outline" onClick={() => onDelete(asset.id, asset.name)}>
                <TrashIcon size={16} /> Sil
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
