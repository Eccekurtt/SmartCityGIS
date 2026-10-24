import { categoryLabels, statusLabels } from '../labels'
import type { Asset } from '../types'

interface Props {
  assets: Asset[]
  onEdit: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

export function AssetTable({ assets, onEdit, onDelete }: Props) {
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
          <tr key={asset.id}>
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
              <button onClick={() => onEdit(asset)}>Düzenle</button>
              <button className="danger" onClick={() => onDelete(asset)}>
                Sil
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
