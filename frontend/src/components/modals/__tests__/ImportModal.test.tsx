import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ImportModal from '../../../components/modals/ImportModal'
import '@testing-library/jest-dom'

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('ImportModal', () => {
  it('renders when open', () => {
    render(<ImportModal open onClose={() => {}} />, { wrapper: createWrapper() })
    expect(screen.getByText('Import Resources from CSV')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ImportModal open={false} onClose={() => {}} />, { wrapper: createWrapper() })
    expect(screen.queryByText('Import Resources from CSV')).not.toBeInTheDocument()
  })

  it('shows upload step indicator when open', () => {
    render(<ImportModal open onClose={() => {}} />, { wrapper: createWrapper() })
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('shows drop zone text', () => {
    render(<ImportModal open onClose={() => {}} />, { wrapper: createWrapper() })
    expect(screen.getByText(/Drop CSV file here/i)).toBeInTheDocument()
  })

  it('calls onClose when close button (×) is clicked', () => {
    const onClose = vi.fn()
    render(<ImportModal open onClose={onClose} />, { wrapper: createWrapper() })
    // The Modal component renders a "×" button for closing
    const closeButtons = screen.getAllByRole('button')
    const closeBtn = closeButtons.find((b) => b.textContent === '×')
    expect(closeBtn).toBeTruthy()
    fireEvent.click(closeBtn!)
    expect(onClose).toHaveBeenCalled()
  })
})
