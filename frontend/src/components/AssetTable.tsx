import { useEffect, useRef } from 'react'
import { categoryLabels, statusLabels } from '../labels'
import type { Asset } from '../types'

interface Props {
  assets: Asset[]
  selectedId: number | null
  onSelect: (id: number) => void
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

export function AssetTable({ assets, selectedId, onSelect, onEdit, onDelete }: Props) {
  const selectedRow = useRef<HTMLTableRowElement | null>(null)

  // Haritadan bir işaretçi seçilince ilgili satırı görünür alana getir.
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  if (assets.length === 0) {
    return <p className="empty">Kriterlere uyan varlık bulunamadı.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Ad</th>
          <th>Kategori</th>
          <th>Durum</th>
          <th>Mahalle</th>
          <th>Konum</th>
          <th></th>
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
            <td>{asset.name}</td>
            <td>{categoryLabels[asset.category]}</td>
            <td>
              <span className={`badge badge-${asset.status}`}>{statusLabels[asset.status]}</span>
            </td>
            <td>{asset.neighborhood}</td>
            <td>
              {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
            </td>
            <td className="row-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation() // satır tıklamasını (seçimi) tetiklemesin
                  onEdit(asset)
                }}
              >
                Düzenle
              </button>
              <button
                className="danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(asset)
                }}
              >
                Sil
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
