import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there are no records', () => {
    const { container } = render(<Pagination page={1} totalPages={0} total={0} pageSize={10} onPage={() => {}} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the visible range and page position', () => {
    render(<Pagination page={2} totalPages={3} total={25} pageSize={10} onPage={() => {}} />)

    expect(screen.getByText('Sayfa 2 / 3')).toBeInTheDocument()
    expect(screen.getByText('11–20')).toBeInTheDocument()
  })

  it('disables the previous button on the first page and the next button on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} total={25} pageSize={10} onPage={() => {}} />)
    expect(screen.getByLabelText('Önceki sayfa')).toBeDisabled()
    expect(screen.getByLabelText('Sonraki sayfa')).toBeEnabled()

    rerender(<Pagination page={3} totalPages={3} total={25} pageSize={10} onPage={() => {}} />)
    expect(screen.getByLabelText('Sonraki sayfa')).toBeDisabled()
  })

  it('requests the neighbouring page when a button is clicked', async () => {
    const onPage = vi.fn()
    render(<Pagination page={2} totalPages={3} total={25} pageSize={10} onPage={onPage} />)

    await userEvent.click(screen.getByLabelText('Önceki sayfa'))
    await userEvent.click(screen.getByLabelText('Sonraki sayfa'))

    expect(onPage).toHaveBeenNthCalledWith(1, 1)
    expect(onPage).toHaveBeenNthCalledWith(2, 3)
  })
})
