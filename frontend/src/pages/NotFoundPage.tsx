import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="card not-found">
      <h1>Sayfa bulunamadı</h1>
      <p>Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link className="btn primary" to="/">
        Haritaya dön
      </Link>
    </div>
  )
}
