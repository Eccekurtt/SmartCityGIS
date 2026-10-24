import type { Asset } from '../types'
import { CheckIcon, PauseIcon, PinIcon, WrenchIcon } from './icons'

interface Props {
  assets: Asset[]
  loading: boolean
}

export function StatCards({ assets, loading }: Props) {
  const total = assets.length
  const count = (status: Asset['status']) => assets.filter((a) => a.status === status).length
  const share = (n: number) => (total === 0 ? '—' : `%${Math.round((n / total) * 100)}`)

  const cards = [
    { key: 'total', label: 'Toplam Varlık', value: total, note: 'Kayıtlı tüm varlıklar', tone: 'blue', icon: <PinIcon /> },
    { key: 'active', label: 'Aktif', value: count('Active'), note: `${share(count('Active'))} oranında`, tone: 'green', icon: <CheckIcon /> },
    { key: 'maint', label: 'Bakımda', value: count('UnderMaintenance'), note: `${share(count('UnderMaintenance'))} oranında`, tone: 'amber', icon: <WrenchIcon /> },
    { key: 'inactive', label: 'Pasif', value: count('Inactive'), note: `${share(count('Inactive'))} oranında`, tone: 'slate', icon: <PauseIcon /> },
  ]

  return (
    <section className="stats" aria-label="Özet">
      {cards.map((card) => (
        <article key={card.key} className="card stat">
          <span className={`stat-icon tone-${card.tone}`}>{card.icon}</span>
          <div>
            <div className="stat-label">{card.label}</div>
            {loading ? (
              <div className="skeleton skeleton-stat" />
            ) : (
              <div className="stat-value">{card.value}</div>
            )}
            <div className="stat-note">{card.note}</div>
          </div>
        </article>
      ))}
    </section>
  )
}
