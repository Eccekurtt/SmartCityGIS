import { categoryColors, categoryLabels, geometryLabels, statusLabels } from '../labels'
import { formatArea, formatLength } from '../lib/format'
import type { AssetListItem, AssetSort } from '../types'
import { ArrowDownIcon, ArrowUpIcon, EditIcon, LineIcon, PointIcon, PolygonIcon, TrashIcon } from './icons'

interface Props {
  assets: AssetListItem[]
  loading: boolean
  fetching: boolean
  sort: AssetSort
  onSort: (sort: AssetSort['sort']) => void
  selectedId: number | null
  onSelect: (id: number) => void
  onOpen: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (asset: AssetListItem) => void
  canEdit: boolean
  canDelete: boolean
}

function GeometryBadge({ type }: { type: string }) {
  const Icon = type.includes('Polygon') ? PolygonIcon : type.includes('Line') ? LineIcon : PointIcon
  return (
    <span className="geom-badge" title={geometryLabels[type] ?? type}>
      <Icon size={14} />
      {geometryLabels[type] ?? type}
    </span>
  )
}

export function AssetTable({
  assets,
  loading,
  fetching,
  sort,
  onSort,
  selectedId,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: Props) {
  if (loading) {
    return (
      <div className="table-state">
        {Array.from({ length: 6 }, (_, i) => (
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

  const header = (key: AssetSort['sort'], label: string) => (
    <th aria-sort={sort.sort === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button className="sort-btn" onClick={() => onSort(key)}>
        {label}
        {sort.sort === key && (sort.desc ? <ArrowDownIcon size={12} /> : <ArrowUpIcon size={12} />)}
      </button>
    </th>
  )

  return (
    <div className={`table-scroll ${fetching ? 'is-fetching' : ''}`}>
      <table>
        <thead>
          <tr>
            {header('name', 'Varlık')}
            <th>Tür</th>
            {header('category', 'Kategori')}
            {header('status', 'Durum')}
            {header('neighborhood', 'Mahalle')}
            {header('size', 'Boyut')}
            <th aria-label="İşlemler"></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.id}
              className={asset.id === selectedId ? 'selected' : undefined}
              onClick={() => onSelect(asset.id)}
              onDoubleClick={() => onOpen(asset.id)}
            >
              <td className="cell-name">{asset.name}</td>
              <td>
                <GeometryBadge type={asset.geometryType} />
              </td>
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
                {asset.areaSquareMeters != null
                  ? formatArea(asset.areaSquareMeters)
                  : asset.lengthMeters != null
                    ? formatLength(asset.lengthMeters)
                    : '—'}
              </td>
              <td className="cell-actions">
                <button
                  className="icon-btn"
                  aria-label={`${asset.name} ayrıntıları`}
                  title="Ayrıntılar"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(asset.id)
                  }}
                >
                  <PointIcon size={16} />
                </button>
                {canEdit && (
                  <button
                    className="icon-btn"
                    aria-label={`${asset.name} düzenle`}
                    title="Düzenle"
                    onClick={(e) => {
                      e.stopPropagation() // satır tıklamasını (seçimi) tetiklemesin
                      onEdit(asset.id)
                    }}
                  >
                    <EditIcon size={16} />
                  </button>
                )}
                {canDelete && (
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
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
