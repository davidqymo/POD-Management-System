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
        borderColor: '#f0f0f0',
        backgroundColor: '#fafafa'
      }}
    >
      <div className="flex items-center justify-between h-full px-8">
        <div className="animate-slide-up">
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-bold"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#171717',
                letterSpacing: '-0.02em'
              }}
            >
              {title}
            </h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              v1.0
            </span>
          </div>
          {description && (
            <p
              className="text-sm mt-1 text-gray-500"
              style={{
                fontFamily: 'var(--font-body)'
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}