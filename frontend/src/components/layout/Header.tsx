import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Resources',
  '/resources': 'Resources',
  '/projects': 'Projects',
  '/projects/new': 'Projects',
  '/allocations': 'Allocations',
  '/rates': 'Rates',
  '/admin': 'Admin',
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Manage team resources and allocations',
  '/resources': 'Manage team resources and allocations',
  '/projects': 'Manage projects and schedules',
  '/projects/new': 'Create a new project',
  '/allocations': 'View resource allocations',
  '/rates': 'Manage rate cards',
  '/admin': 'System administration',
}

export default function Header() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'POD Management'
  const description = PAGE_DESCRIPTIONS[location.pathname] || ''

  return (
    <header
      className="h-16 shrink-0 border-b"
      style={{
        borderColor: '#e5e5e5',
        backgroundColor: '#fefefe'
      }}
    >
      <div className="flex items-center justify-between h-full px-8">
        <div className="animate-slide-up">
          <h1
            className="text-xl font-semibold"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#171717',
              letterSpacing: '-0.02em'
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-sm mt-0.5"
              style={{
                color: '#737373',
                fontFamily: 'var(--font-body)'
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Optional: Header actions could go here */}
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: '#f0f7f7',
              color: '#135d5d',
              fontFamily: 'var(--font-mono)'
            }}
          >
            POD v1.0
          </span>
        </div>
      </div>
    </header>
  )
}