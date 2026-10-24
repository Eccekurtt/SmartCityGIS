import { useEffect, useRef } from 'react'
import { categoryColors, categoryLabels, statusLabels } from '../labels'
import type { Asset } from '../types'
import { EditIcon, TrashIcon } from './icons'

interface Props {
  assets: Asset[]
  loading: boolean
  selectedId: number | null
  onSelect: (id: number) => void
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

export function AssetTable({ assets, loading, selectedId, onSelect, onEdit, onDelete }: Props) {
  const selectedRow = useRef<HTMLTableRowElement | null>(null)

  // Haritadan bir işaretçi seçilince ilgili satırı görünür alana getir.
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  if (loading) {
    return (
      <div className="table-state">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton skeleton-row" />
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="table-state empty">
        <strong>Sonuç bulunamadı</strong>
        <span>Arama veya filtre kriterlerini değiştirmeyi deneyin.</span>
      </div>
    )
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Varlık</th>
            <th>Kategori</th>
            <th>Durum</th>
            <th>Mahalle</th>
            <th>Konum</th>
            <th aria-label="İşlemler"></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.id}
              ref={asset.id === selectedId ? selectedRow : undefined}
              className={asset.id === selectedId ? 'selected' : undefined}
              onClick={() => onSelect(asset.id)}
            >
              <td className="cell-name">{asset.name}</td>
              <td>
                <span className="chip">
                  <span className="dot" style={{ background: categoryColors[asset.category] }} />
                  {categoryLabels[asset.category]}
                </span>
              </td>
              <td>
                <span className={`badge badge-${asset.status}`}>{statusLabels[asset.status]}</span>
              </td>
              <td>{asset.neighborhood}</td>
              <td className="cell-mono">
                {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
              </td>
              <td className="cell-actions">
                <button
                  className="icon-btn"
                  aria-label={`${asset.name} düzenle`}
                  title="Düzenle"
                  onClick={(e) => {
                    e.stopPropagation() // satır tıklamasını (seçimi) tetiklemesin
                    onEdit(asset)
                  }}
                >
                  <EditIcon size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={`${asset.name} sil`}
                  title="Sil"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(asset)
                  }}
                >
                  <TrashIcon size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
