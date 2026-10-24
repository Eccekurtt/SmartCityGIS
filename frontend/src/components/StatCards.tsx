import type { Summary } from '../types'
import { formatArea, formatLength } from '../lib/format'
import { CheckIcon, PauseIcon, PinIcon, WrenchIcon } from './icons'

interface Props {
  summary: Summary | undefined
  loading: boolean
}

const countOf = (summary: Summary | undefined, status: string) =>
  summary?.byStatus.find((s) => s.key === status)?.count ?? 0

export function StatCards({ summary, loading }: Props) {
  const total = summary?.total ?? 0
  const share = (n: number) => (total === 0 ? '—' : `%${Math.round((n / total) * 100)}`)

  const cards = [
    {
      key: 'total',
      label: 'Toplam Varlık',
      value: total,
      note: summary
        ? `${formatLength(summary.totalLengthKm * 1000)} çizgi · ${formatArea(summary.totalAreaHectares * 10_000)} alan`
        : '',
      tone: 'blue',
      icon: <PinIcon />,
    },
    {
      key: 'active',
      label: 'Aktif',
      value: countOf(summary, 'Active'),
      note: `${share(countOf(summary, 'Active'))} oranında`,
      tone: 'green',
      icon: <CheckIcon />,
    },
    {
      key: 'maint',
      label: 'Bakımda',
      value: countOf(summary, 'UnderMaintenance'),
      note: `${share(countOf(summary, 'UnderMaintenance'))} oranında`,
      tone: 'amber',
      icon: <WrenchIcon />,
    },
    {
      key: 'inactive',
      label: 'Pasif',
      value: countOf(summary, 'Inactive'),
      note: `${share(countOf(summary, 'Inactive'))} oranında`,
      tone: 'slate',
      icon: <PauseIcon />,
    },
  ]

  return (
    <section className="stats" aria-label="Özet">
      {cards.map((card) => (
        <article key={card.key} className="card stat">
          <span className={`stat-icon tone-${card.tone}`}>{card.icon}</span>
          <div>
            <div className="stat-label">{card.label}</div>
            {loading ? <div className="skeleton skeleton-stat" /> : <div className="stat-value">{card.value}</div>}
            <div className="stat-note">{card.note}</div>
          </div>
        </article>
      ))}
    </section>
  )
}
