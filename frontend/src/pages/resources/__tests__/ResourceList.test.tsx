import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import ResourceList from '../ResourceList'
import '@testing-library/jest-dom'

// Mock the useResources hook — must be at module scope for hoisting
const mockUseResources = vi.hoisted(() =>
  vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  }))
)

vi.mock('../../../hooks/useResources', () => ({
  useResources: mockUseResources,
}))

// Mock admin filter API - return default options to avoid loading states
vi.mock('../../../api/admin', () => ({
  listFiltersByCategory: vi.fn(() =>
    Promise.resolve([
      { id: 1, category: 'skill', value: 'backend', displayOrder: 1, isActive: true },
      { id: 2, category: 'skill', value: 'frontend', displayOrder: 2, isActive: true },
    ])
  ),
}))

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ResourceList', () => {
  beforeEach(() => {
    mockUseResources.mockReturnValue({
      data: { content: [], totalElements: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    })
  })

  it('renders the page header', () => {
    render(<ResourceList />, { wrapper: createWrapper() })
    expect(screen.getByText('Resources')).toBeInTheDocument()
  })

  it('renders search input with placeholder', () => {
    render(<ResourceList />, { wrapper: createWrapper() })
    expect(screen.getByPlaceholderText('Search by name, ID, or cost center...')).toBeInTheDocument()
  })

  it('renders filter dropdowns', () => {
    render(<ResourceList />, { wrapper: createWrapper() })
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes.length).toBeGreaterThanOrEqual(4)
  })

  it('renders Export button', () => {
    render(<ResourceList />, { wrapper: createWrapper() })
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('renders empty state when no resources', () => {
    render(<ResourceList />, { wrapper: createWrapper() })
    expect(screen.getByText('No resources found matching your filters.')).toBeInTheDocument()
  })

  it('renders resource count when data loaded', () => {
    mockUseResources.mockReturnValue({
      data: {
        content: [
          { id: 1, externalId: 'EMP-001', name: 'Alice', costCenterId: 'CC-ENG', billableTeamCode: 'BTC-API', category: 'PERMANENT', skill: 'backend', level: 5, status: 'ACTIVE', isBillable: true, isActive: true, version: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        ],
        totalElements: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    })
    render(<ResourceList />, { wrapper: createWrapper() })
    expect(screen.getByText('1 resource in the system')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    mockUseResources.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    })
    render(<ResourceList />, { wrapper: createWrapper() })
    // Both the header subtitle and DataTable show "Loading..." — verify at least one exists
    expect(screen.getAllByText('Loading...').length).toBeGreaterThanOrEqual(1)
  })
})
