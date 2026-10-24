import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../context/ToastContext'
import type { AssetFilters } from '../types'
import { FilterBar } from './FilterBar'

const empty: AssetFilters = { search: '', categories: [], statuses: [], neighborhood: '' }

// FilterBar kontrollü bir bileşen; gerçek kullanımdaki gibi durumu bir üst bileşen tutar.
function Harness({ onState }: { onState?: (f: AssetFilters) => void }) {
  const [filters, setFilters] = useState<AssetFilters>(empty)
  onState?.(filters)

  return (
    <ToastProvider>
      <FilterBar
        filters={filters}
        onChange={(update) => setFilters(update)}
        total={12}
        neighborhoods={['Çankaya', 'Ulus']}
      />
    </ToastProvider>
  )
}

describe('FilterBar', () => {
  it('shows the result count and the neighbourhood options', () => {
    render(<Harness />)

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Çankaya' })).toBeInTheDocument()
  })

  it('toggles several category chips without losing earlier selections', async () => {
    let latest = empty
    render(<Harness onState={(f) => (latest = f)} />)

    await userEvent.click(screen.getByRole('button', { name: 'Park' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yol' }))

    expect(latest.categories).toEqual(['Park', 'Road'])
    expect(screen.getByRole('button', { name: 'Park' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Park' }))
    expect(latest.categories).toEqual(['Road'])
  })

  it('shows a clear button only while a filter is active and resets everything', async () => {
    let latest = empty
    render(<Harness onState={(f) => (latest = f)} />)
    expect(screen.queryByRole('button', { name: 'Temizle' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText(/ara/i), 'park')
    await userEvent.click(screen.getByRole('button', { name: 'Bakımda' }))
    expect(latest).toMatchObject({ search: 'park', statuses: ['UnderMaintenance'] })

    await userEvent.click(screen.getByRole('button', { name: 'Temizle' }))
    expect(latest).toEqual(empty)
    expect(screen.queryByRole('button', { name: 'Temizle' })).not.toBeInTheDocument()
  })

  it('keeps a neighbourhood picked on the map selectable even if no asset lists it', () => {
    render(
      <ToastProvider>
        <FilterBar
          filters={{ ...empty, neighborhood: 'Yaşamkent' }}
          onChange={() => {}}
          total={3}
          neighborhoods={['Çankaya']}
        />
      </ToastProvider>,
    )

    expect(screen.getByRole('combobox', { name: 'Mahalle' })).toHaveValue('Yaşamkent')
  })
})
