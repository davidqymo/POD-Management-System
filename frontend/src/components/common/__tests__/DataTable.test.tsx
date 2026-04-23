import { render, screen } from '@testing-library/react'
import DataTable from '../../../components/common/DataTable'
import type { Column } from '../../../components/common/DataTable'
import '@testing-library/jest-dom'

interface TestRow {
  id: number
  name: string
  email: string
}

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name', render: (r) => <span>{r.name}</span> },
  { key: 'email', header: 'Email', render: (r) => <span>{r.email}</span> },
]

const sampleData: TestRow[] = [
  { id: 1, name: 'Alice', email: 'alice@test.com' },
  { id: 2, name: 'Bob', email: 'bob@test.com' },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={sampleData} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={sampleData} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('renders default empty message', () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('renders loading spinner when isLoading', () => {
    render(<DataTable columns={columns} data={[]} isLoading />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
