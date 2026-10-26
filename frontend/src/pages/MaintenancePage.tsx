import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AssetDetail } from '../components/AssetDetail'
import { SearchIcon } from '../components/icons'
import { MaintenanceActions } from '../components/MaintenanceActions'
import { MaintenanceStatusBadge, PriorityBadge, TypeLabel } from '../components/MaintenanceBadges'
import { Pagination } from '../components/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import { useMaintenanceList, useMaintenanceSummary } from '../hooks/maintenance'
import { usePermissions } from '../hooks/usePermissions'
import {
  categoryColors,
  maintenanceStatusColors,
  maintenanceStatuses,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
  maintenanceTypes,
} from '../labels'
import { formatCurrency, formatDate } from '../lib/format'
import type { MaintenanceFilters, MaintenanceStatus, MaintenanceType } from '../types'

const PAGE_SIZE = 15

const emptyFilters: MaintenanceFilters = { statuses: [], types: [], overdueOnly: false, search: '' }

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function MaintenancePage() {
  const navigate = useNavigate()
  const { canWrite, canDelete } = usePermissions()

  const [filters, setFilters] = useState<MaintenanceFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(filters.search, 300)
  const queryFilters = { ...filters, search: debouncedSearch }

  const list = useMaintenanceList(queryFilters, page, PAGE_SIZE)
  const summary = useMaintenanceSummary()

  function change(update: (f: MaintenanceFilters) => MaintenanceFilters) {
    setFilters(update)
    setPage(1)
  }

  const active =
    filters.statuses.length > 0 || filters.types.length > 0 || filters.overdueOnly || filters.search !== ''
  const s = summary.data

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bakım Yönetimi</h1>
          <p>Planlı, devam eden ve geciken bakım işlerini takip edin. Yeni bakım, varlığın ayrıntı panelinden planlanır.</p>
        </div>
      </div>

      <section className="kpi-grid" aria-label="Bakım özeti">
        <article className="card kpi">
          <div className="kpi-label">Planlı</div>
          <div className="kpi-value">{s?.planned ?? '—'}</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Devam eden</div>
          <div className="kpi-value">{s?.inProgress ?? '—'}</div>
        </article>
        <button
          className={`card kpi kpi-button${s && s.overdue > 0 ? ' kpi-danger' : ''}`}
          onClick={() => change((f) => ({ ...f, overdueOnly: !f.overdueOnly }))}
          aria-pressed={filters.overdueOnly}
        >
          <div className="kpi-label">Geciken</div>
          <div className="kpi-value">{s?.overdue ?? '—'}</div>
          <div className="kpi-note">Filtrelemek için tıklayın</div>
        </button>
        <article className="card kpi">
          <div className="kpi-label">7 gün içinde</div>
          <div className="kpi-value">{s?.dueNext7Days ?? '—'}</div>
        </article>
        <article className="card kpi">
          <div className="kpi-label">Son 30 gün tamamlanan</div>
          <div className="kpi-value">{s?.completedLast30Days ?? '—'}</div>
          <div className="kpi-note">{s ? formatCurrency(s.costLast30Days) : ''}</div>
        </article>
      </section>

      <section className="card filters" aria-label="Filtreler">
        <div className="filters-row">
          <label className="search">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Varlık adı veya mahalle ara..."
              value={filters.search}
              onChange={(e) => {
                const search = e.target.value
                change((f) => ({ ...f, search }))
              }}
            />
          </label>
          {active && (
            <button className="btn ghost" onClick={() => change(() => emptyFilters)}>
              Temizle
            </button>
          )}
          <span className="count">
            {list.data ? (
              <>
                <strong>{list.data.total}</strong> kayıt
              </>
            ) : (
              '…'
            )}
          </span>
        </div>
        <div className="filters-row chips">
          <span className="chips-label">Durum</span>
          {maintenanceStatuses.map((status: MaintenanceStatus) => (
            <button
              key={status}
              className={`filter-chip ${filters.statuses.includes(status) ? 'on' : ''}`}
              aria-pressed={filters.statuses.includes(status)}
              onClick={() => change((f) => ({ ...f, statuses: toggle(f.statuses, status) }))}
            >
              <span className="dot" style={{ background: maintenanceStatusColors[status] }} />
              {maintenanceStatusLabels[status]}
            </button>
          ))}
          <span className="chips-label spaced">Tür</span>
          {maintenanceTypes.map((type: MaintenanceType) => (
            <button
              key={type}
              className={`filter-chip ${filters.types.includes(type) ? 'on' : ''}`}
              aria-pressed={filters.types.includes(type)}
              onClick={() => change((f) => ({ ...f, types: toggle(f.types, type) }))}
            >
              {maintenanceTypeLabels[type]}
            </button>
          ))}
        </div>
      </section>

      <section className="card table-card" aria-label="Bakım kayıtları">
        {list.isLoading ? (
          <div className="table-state">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        ) : list.error ? (
          <div className="table-state empty">
            <strong>Bakım kayıtları alınamadı</strong>
            <span>{list.error.message}</span>
          </div>
        ) : list.data && list.data.items.length === 0 ? (
          <div className="table-state empty">
            <strong>Kayıt bulunamadı</strong>
            <span>Filtreleri değiştirmeyi deneyin.</span>
          </div>
        ) : (
          <div className={`table-scroll tall ${list.isFetching ? 'is-fetching' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th>İş</th>
                  <th>Varlık</th>
                  <th>Tür</th>
                  <th>Öncelik</th>
                  <th>Planlanan</th>
                  <th>Durum</th>
                  <th>Maliyet</th>
                  <th aria-label="İşlemler"></th>
                </tr>
              </thead>
              <tbody>
                {list.data?.items.map((record) => (
                  <tr key={record.id} className={record.isOverdue ? 'row-overdue' : undefined}>
                    <td className="cell-name">{record.title}</td>
                    <td>
                      <button className="link-btn" onClick={() => setDetailId(record.assetId)}>
                        <span className="dot" style={{ background: categoryColors[record.assetCategory] }} />
                        {record.assetName}
                      </button>
                    </td>
                    <td>
                      <TypeLabel type={record.type} />
                    </td>
                    <td>
                      <PriorityBadge priority={record.priority} />
                    </td>
                    <td>{formatDate(record.scheduledDate)}</td>
                    <td>
                      <MaintenanceStatusBadge record={record} />
                    </td>
                    <td className="cell-mono">{formatCurrency(record.cost)}</td>
                    <td className="cell-actions-wide">
                      <MaintenanceActions record={record} canEdit={canWrite} canDelete={canDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <Pagination
            page={list.data.page}
            totalPages={list.data.totalPages}
            total={list.data.total}
            pageSize={list.data.pageSize}
            onPage={setPage}
          />
        )}
      </section>

      {detailId !== null && (
        <AssetDetail
          id={detailId}
          initialTab="maintenance"
          onClose={() => setDetailId(null)}
          onShowOnMap={(id) => navigate(`/?select=${id}`)}
          onEdit={(id) => navigate(`/?select=${id}`)}
          onDelete={(id) => navigate(`/?select=${id}`)}
          canEdit={canWrite}
          canDelete={false}
        />
      )}
    </>
  )
}
