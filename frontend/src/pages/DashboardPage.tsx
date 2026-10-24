import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MaintenanceStatusBadge, PriorityBadge } from '../components/MaintenanceBadges'
import { useDashboard } from '../hooks/maintenance'
import {
  categoryColors,
  categoryLabels,
  maintenanceTypeLabels,
  statusColors,
  statusLabels,
} from '../labels'
import { formatArea, formatCurrency, formatDate, formatLength } from '../lib/format'
import type { AssetCategory, AssetStatus, Dashboard, MaintenanceType } from '../types'

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
}

const axisTick = { fill: 'var(--muted)', fontSize: 12 }

const TYPE_COLORS: Record<MaintenanceType, string> = {
  Routine: '#2563eb',
  Repair: '#d97706',
  Inspection: '#7c3aed',
  Replacement: '#0ea5e9',
  Emergency: '#dc2626',
}

function monthLabel(month: string) {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
}

function Card({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`card chart-card${wide ? ' wide' : ''}`}>
      <header>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'danger' | 'warn' | 'ok' }) {
  return (
    <article className={`card kpi${tone ? ` kpi-${tone}` : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-note">{note}</div>}
    </article>
  )
}

function DashboardBody({ data }: { data: Dashboard }) {
  const { summary } = data
  const open = (data.maintenanceByStatus.find((s) => s.key === 'Planned')?.count ?? 0) +
    (data.maintenanceByStatus.find((s) => s.key === 'InProgress')?.count ?? 0)

  const categoryData = summary.byCategory.map((c) => ({
    name: categoryLabels[c.key as AssetCategory] ?? c.key,
    value: c.count,
    color: categoryColors[c.key as AssetCategory] ?? '#94a3b8',
  }))

  const statusData = (['Active', 'UnderMaintenance', 'Inactive'] as AssetStatus[]).map((status) => ({
    key: status,
    label: statusLabels[status],
    count: summary.byStatus.find((s) => s.key === status)?.count ?? 0,
    color: statusColors[status],
  }))

  const monthly = data.maintenanceByMonth.map((m) => ({ ...m, label: monthLabel(m.month) }))
  const typeData = data.maintenanceByType
    .map((t) => ({ key: t.key as MaintenanceType, name: maintenanceTypeLabels[t.key as MaintenanceType] ?? t.key, count: t.count }))
    .sort((a, b) => b.count - a.count)
  const maxType = Math.max(1, ...typeData.map((t) => t.count))

  return (
    <>
      <section className="kpi-grid" aria-label="Göstergeler">
        <Kpi label="Toplam varlık" value={String(summary.total)} note={`${formatLength(summary.totalLengthKm * 1000)} çizgi · ${formatArea(summary.totalAreaHectares * 10_000)} alan`} />
        <Kpi label="Açık bakım işi" value={String(open)} note="Planlı + devam eden" />
        <Kpi label="Geciken bakım" value={String(data.overdueCount)} note="Planlı tarihi geçmiş" tone={data.overdueCount > 0 ? 'danger' : 'ok'} />
        <Kpi label="12 aylık bakım maliyeti" value={formatCurrency(data.costLast12Months)} note="Tamamlanan işler" />
        <Kpi label="Ort. tamamlanma süresi" value={data.avgCompletionDays != null ? `${data.avgCompletionDays} gün` : '—'} note="Başlangıçtan bitişe" />
        <Kpi label="Hiç bakımı olmayan" value={String(data.assetsNeverMaintained)} note="Varlık sayısı" tone={data.assetsNeverMaintained > 0 ? 'warn' : 'ok'} />
      </section>

      <div className="chart-grid">
        <Card title="Kategoriye göre varlıklar" subtitle="Envanterin dağılımı">
          <div className="chart-box short">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="var(--surface)">
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Duruma göre varlıklar" subtitle="Aktif, bakımda, pasif">
          <ul className="bars">
            {statusData.map((s) => (
              <li key={s.key}>
                <div className="bar-head">
                  <span>{s.label}</span>
                  <strong>{s.count}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${summary.total ? (s.count / summary.total) * 100 : 0}%`, background: s.color }} />
                </div>
              </li>
            ))}
          </ul>
          <h3 className="mini-title">Bakım türleri</h3>
          <ul className="bars">
            {typeData.map((t) => (
              <li key={t.key}>
                <div className="bar-head">
                  <span>{t.name}</span>
                  <strong>{t.count}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(t.count / maxType) * 100}%`, background: TYPE_COLORS[t.key] }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Mahalle bazında ilk 10" subtitle="Varlık sayısı ve bakımdakiler" wide>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topNeighborhoods} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={axisTick} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-2)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                <Bar dataKey="assets" name="Varlık" fill="#2563eb" radius={[0, 4, 4, 0]} />
                <Bar dataKey="underMaintenance" name="Bakımda" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Aylık tamamlanan bakım" subtitle="Son 12 ay · adet ve maliyet" wide>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis yAxisId="left" tick={axisTick} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={axisTick} tickFormatter={(v: number) => `${Math.round(v / 1000)}b`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => (name === 'Maliyet' ? formatCurrency(Number(value)) : value)}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                <Bar yAxisId="left" dataKey="completed" name="Tamamlanan" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cost" name="Maliyet" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Yaklaşan ve geciken işler" subtitle="Önümüzdeki 14 gün ve gecikmişler" wide>
          {data.upcoming.length === 0 ? (
            <p className="empty-note">Planlı bakım işi yok.</p>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>İş</th>
                  <th>Varlık</th>
                  <th>Tarih</th>
                  <th>Öncelik</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {data.upcoming.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-name">{item.title}</td>
                    <td>
                      <Link to={`/?select=${item.assetId}`}>{item.assetName}</Link>
                    </td>
                    <td>{formatDate(item.scheduledDate)}</td>
                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td>
                      <MaintenanceStatusBadge record={{ status: 'Planned', isOverdue: item.isOverdue }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="card-footer">
            <Link to="/bakim">Tüm bakım işlerine git →</Link>
          </div>
        </Card>
      </div>
    </>
  )
}

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard()

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Yönetim Paneli</h1>
          <p>Envanter, bakım iş yükü ve mahalle dağılımına genel bakış.</p>
        </div>
      </div>

      {isLoading && (
        <>
          <section className="kpi-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card kpi">
                <div className="skeleton skeleton-stat" />
              </div>
            ))}
          </section>
          <div className="card chart-card">
            <div className="skeleton skeleton-chart" />
          </div>
        </>
      )}

      {error && (
        <div className="card banner-error" role="alert">
          <div>
            <strong>Panel verileri alınamadı.</strong> {error.message}
          </div>
          <button className="btn" onClick={() => void refetch()}>
            Tekrar dene
          </button>
        </div>
      )}

      {data && <DashboardBody data={data} />}
    </>
  )
}
