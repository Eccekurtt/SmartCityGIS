import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { PinIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'

// Demo hesapları yalnızca geliştirmede veya VITE_SHOW_DEMO=true ile (demo dağıtımı) gösterilir.
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true'

const DEMO_ACCOUNTS = [
  { label: 'Yönetici', userName: 'admin', password: 'Admin123!', note: 'her şey' },
  { label: 'Operatör', userName: 'operator', password: 'Operator123!', note: 'ekle / düzenle' },
  { label: 'İzleyici', userName: 'izleyici', password: 'Izleyici123!', note: 'salt okunur' },
]

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const target = (location.state as { from?: string } | null)?.from ?? '/'

  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to={target} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(userName, password)
      navigate(target, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Çok fazla deneme yaptınız. Lütfen bir dakika sonra tekrar deneyin.'
          : err instanceof ApiError
            ? err.message
            : 'Sunucuya ulaşılamadı.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          <span className="brand-mark">
            <PinIcon size={22} />
          </span>
          <div>
            <h1>SmartCity GIS</h1>
            <p>Belediye Varlık Yönetim Sistemi</p>
          </div>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Kullanıcı adı
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label>
            Parola
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn primary login-submit" type="submit" disabled={busy}>
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>

        {SHOW_DEMO && (
          <div className="demo-box">
            <strong>Demo hesapları</strong>
            <p>Tıklayarak doldurun (yalnızca geliştirme/demo ortamında görünür):</p>
            <div className="demo-list">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.userName}
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setUserName(account.userName)
                    setPassword(account.password)
                  }}
                >
                  {account.label} <small>({account.note})</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
