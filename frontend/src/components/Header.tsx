import { NavLink } from 'react-router-dom'
import { PinIcon } from './icons'

const links = [
  { to: '/', label: 'Harita', end: true },
  { to: '/panel', label: 'Panel', end: false },
  { to: '/bakim', label: 'Bakım', end: false },
]

export function Header() {
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

        <nav className="nav" aria-label="Ana menü">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
