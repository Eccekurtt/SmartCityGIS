import { PinIcon, PlusIcon } from './icons'

interface Props {
  onNew: () => void
  disabled: boolean
}

export function Header({ onNew, disabled }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-mark">
            <PinIcon size={20} />
          </span>
          <div>
            <div className="brand-name">SmartCity GIS</div>
            <div className="brand-sub">Belediye Varlık Yönetim Sistemi</div>
          </div>
        </div>

        <button className="btn primary" onClick={onNew} disabled={disabled}>
          <PlusIcon size={16} />
          Yeni Varlık
        </button>
      </div>
    </header>
  )
}
