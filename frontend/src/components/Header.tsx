import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { roleLabels } from '../labels'
import { PinIcon } from './icons'

interface NavItem {
  to: string
  label: string
  end?: boolean
  adminOnly?: boolean
}

const links: NavItem[] = [
  { to: '/', label: 'Harita', end: true },
  { to: '/panel', label: 'Panel' },
  { to: '/bakim', label: 'Bakım' },
  { to: '/veri', label: 'Veri' },
  { to: '/kullanicilar', label: 'Kullanıcılar', adminOnly: true },
  { to: '/denetim', label: 'Denetim', adminOnly: true },
]

export function Header() {
  const { user, logout } = useAuth()
  const { isAdmin } = usePermissions()
  const navigate = useNavigate()

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
          {links
            .filter((link) => !link.adminOnly || isAdmin)
            .map((link) => (
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

        {user && (
          <div className="user-chip">
            <div className="user-text">
              <span className="user-name">{user.displayName}</span>
              <span className="user-role">{roleLabels[user.role]}</span>
            </div>
            <button
              className="logout-btn"
              onClick={() => {
                logout()
                navigate('/giris', { replace: true })
              }}
            >
              Çıkış
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
