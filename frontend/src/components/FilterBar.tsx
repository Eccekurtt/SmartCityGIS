import { categories, categoryColors, categoryLabels, statusColors, statuses, statusLabels } from '../labels'
import type { AssetCategory, AssetFilters, AssetStatus } from '../types'
import { SearchIcon } from './icons'

interface Props {
  filters: AssetFilters
  // Fonksiyonel güncelleme: ardışık tıklamalar eski değeri ezmesin.
  onChange: (update: (current: AssetFilters) => AssetFilters) => void
  total: number | undefined
  neighborhoods: string[]
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FilterBar({ filters, onChange, total, neighborhoods }: Props) {
  const active =
    filters.search !== '' || filters.categories.length > 0 || filters.statuses.length > 0 || filters.neighborhood !== ''

  return (
    <section className="card filters" aria-label="Arama ve filtreler">
      <div className="filters-row">
        <label className="search">
          <SearchIcon size={16} />
          <input
            type="search"
            placeholder="Ad veya mahalle ara... (Türkçe karakter duyarsız)"
            value={filters.search}
            onChange={(e) => {
              const search = e.target.value
              onChange((f) => ({ ...f, search }))
            }}
          />
        </label>

        <select
          aria-label="Mahalle"
          value={filters.neighborhood}
          onChange={(e) => {
            const neighborhood = e.target.value
            onChange((f) => ({ ...f, neighborhood }))
          }}
        >
          <option value="">Tüm mahalleler</option>
          {neighborhoods.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {active && (
          <button
            className="btn ghost"
            onClick={() => onChange(() => ({ search: '', categories: [], statuses: [], neighborhood: '' }))}
          >
            Temizle
          </button>
        )}

        <span className="count">
          {total === undefined ? (
            '…'
          ) : (
            <>
              <strong>{total}</strong> varlık
            </>
          )}
        </span>
      </div>

      <div className="filters-row chips">
        <span className="chips-label">Kategori</span>
        {categories.map((category: AssetCategory) => (
          <button
            key={category}
            className={`filter-chip ${filters.categories.includes(category) ? 'on' : ''}`}
            aria-pressed={filters.categories.includes(category)}
            onClick={() => onChange((f) => ({ ...f, categories: toggle(f.categories, category) }))}
          >
            <span className="dot" style={{ background: categoryColors[category] }} />
            {categoryLabels[category]}
          </button>
        ))}

        <span className="chips-label spaced">Durum</span>
        {statuses.map((status: AssetStatus) => (
          <button
            key={status}
            className={`filter-chip ${filters.statuses.includes(status) ? 'on' : ''}`}
            aria-pressed={filters.statuses.includes(status)}
            onClick={() => onChange((f) => ({ ...f, statuses: toggle(f.statuses, status) }))}
          >
            <span className="dot" style={{ background: statusColors[status] }} />
            {statusLabels[status]}
          </button>
        ))}
      </div>
    </section>
  )
}
