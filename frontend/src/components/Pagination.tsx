import { ChevronLeftIcon, ChevronRightIcon } from './icons'

interface Props {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPage }: Props) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav className="pagination" aria-label="Sayfalama">
      <span className="pagination-info">
        {total} kayıttan <strong>{from}–{to}</strong> arası
      </span>
      <div className="pagination-buttons">
        <button className="icon-btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Önceki sayfa">
          <ChevronLeftIcon size={18} />
        </button>
        <span className="pagination-page">
          Sayfa {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          className="icon-btn"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Sonraki sayfa"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </nav>
  )
}
