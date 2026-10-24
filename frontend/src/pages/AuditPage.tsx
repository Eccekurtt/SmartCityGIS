import { Fragment, useState } from 'react'
import { Pagination } from '../components/Pagination'
import { useAudit } from '../hooks/admin'
import { auditActionLabels, auditEntityLabels } from '../labels'
import { formatDateTime } from '../lib/format'
import type { AuditEntry, AuditFilters } from '../types'

const PAGE_SIZE = 25

const emptyFilters: AuditFilters = { entityType: '', action: '', userName: '', from: '', to: '' }

// Değişiklik ayrıntısı: { "Status": { "old": "Active", "new": "UnderMaintenance" } }
function Changes({ json }: { json: string }) {
  let parsed: Record<string, { old?: unknown; new?: unknown; changed?: boolean }>
  try {
    parsed = JSON.parse(json)
  } catch {
    return <code>{json}</code>
  }

  return (
    <ul className="changes">
      {Object.entries(parsed).map(([field, change]) => (
        <li key={field}>
          <strong>{field}</strong>
          {change.changed ? (
            <span> değişti</span>
          ) : 'old' in change ? (
            <span>
              {' '}
              <del>{String(change.old ?? '—')}</del> → <ins>{String(change.new ?? '—')}</ins>
            </span>
          ) : (
            <span> = {String(change.new ?? '—')}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function ActionBadge({ action }: { action: string }) {
  return <span className={`audit-badge audit-${action}`}>{auditActionLabels[action] ?? action}</span>
}

export function AuditPage() {
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<number | null>(null)
  const { data, isLoading, isFetching, error } = useAudit(filters, page, PAGE_SIZE)

  function change(patch: Partial<AuditFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const active = Object.values(filters).some((v) => v !== '')

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Denetim Kaydı</h1>
          <p>Kim, ne zaman, neyi değiştirdi? Kayıtlar yalnızca eklenir, değiştirilemez.</p>
        </div>
      </div>

      <section className="card filters" aria-label="Filtreler">
        <div className="filters-row">
          <select aria-label="Tür" value={filters.entityType} onChange={(e) => change({ entityType: e.target.value })}>
            <option value="">Tüm türler</option>
            {Object.entries(auditEntityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select aria-label="İşlem" value={filters.action} onChange={(e) => change({ action: e.target.value })}>
            <option value="">Tüm işlemler</option>
            {Object.entries(auditActionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="plain-input"
            placeholder="Kullanıcı adı"
            value={filters.userName}
            onChange={(e) => change({ userName: e.target.value })}
          />
          <label className="inline-field">
            Başlangıç
            <input className="plain-input" type="date" value={filters.from} onChange={(e) => change({ from: e.target.value })} />
          </label>
          <label className="inline-field">
            Bitiş
            <input className="plain-input" type="date" value={filters.to} onChange={(e) => change({ to: e.target.value })} />
          </label>
          {active && (
            <button className="btn ghost" onClick={() => change({ ...emptyFilters })}>
              Temizle
            </button>
          )}
          <span className="count">{data ? <><strong>{data.total}</strong> kayıt</> : '…'}</span>
        </div>
      </section>

      <section className="card table-card">
        {isLoading ? (
          <div className="table-state">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        ) : error ? (
          <p className="form-error">{error.message}</p>
        ) : data && data.items.length === 0 ? (
          <div className="table-state empty">
            <strong>Kayıt bulunamadı</strong>
          </div>
        ) : (
          <div className={`table-scroll tall ${isFetching ? 'is-fetching' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Kullanıcı</th>
                  <th>İşlem</th>
                  <th>Tür</th>
                  <th>Özet</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((entry: AuditEntry) => (
                  <Fragment key={entry.id}>
                    <tr
                      className={entry.changes ? 'expandable' : undefined}
                      onClick={() => entry.changes && setOpenId(openId === entry.id ? null : entry.id)}
                    >
                      <td className="cell-mono">{formatDateTime(entry.at)}</td>
                      <td>{entry.userName}</td>
                      <td>
                        <ActionBadge action={entry.action} />
                      </td>
                      <td>
                        {auditEntityLabels[entry.entityType] ?? entry.entityType}
                        {entry.entityId && <span className="cell-mono"> #{entry.entityId}</span>}
                      </td>
                      <td>
                        {entry.summary}
                        {entry.changes && <span className="expand-hint"> {openId === entry.id ? '▾' : '▸'} ayrıntı</span>}
                      </td>
                      <td className="cell-mono">{entry.ipAddress ?? '—'}</td>
                    </tr>
                    {openId === entry.id && entry.changes && (
                      <tr className="detail-row">
                        <td colSpan={6}>
                          <Changes json={entry.changes} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} />
        )}
      </section>
    </>
  )
}
