import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Resources',
  '/resources': 'Resources',
  '/projects': 'Projects',
  '/projects/new': 'New Project',
  '/projects/:id': 'Project Details',
  '/allocations': 'Allocations',
  '/rates': 'Rates',
  '/admin': 'Administration',
  '/admin/scroll-notices': 'Scroll Notices',
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Manage team resources, track availability and allocations',
  '/resources': 'Manage team resources, track availability and allocations',
  '/projects': 'Manage projects, track schedules and resource assignments',
  '/projects/new': 'Create a new project and define its details',
  '/allocations': 'View and manage resource allocations across projects',
  '/rates': 'Manage rate cards and billing information',
  '/admin': 'System administration and configuration',
  '/admin/scroll-notices': 'Manage scrolling announcements on the header',
}

export default function Header() {
  const location = useLocation()

  // Get the base path to match titles
  const getTitleForPath = (pathname: string) => {
    // Check for exact match first
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]

    // Check for pattern matches
    if (pathname.startsWith('/projects/') && pathname !== '/projects/new') {
      return PAGE_TITLES['/projects/:id']
    }
    if (pathname.startsWith('/admin/')) return 'Administration'

    return 'POD Management'
  }

  const getDescriptionForPath = (pathname: string) => {
    if (PAGE_DESCRIPTIONS[pathname]) return PAGE_DESCRIPTIONS[pathname]
    if (pathname.startsWith('/projects/') && pathname !== '/projects/new') {
      return 'View and edit project details and allocations'
    }
    if (pathname.startsWith('/admin/')) return PAGE_DESCRIPTIONS['/admin']
    return ''
  }

  const title = getTitleForPath(location.pathname)
  const description = getDescriptionForPath(location.pathname)

  return (
    <header
      className="h-20 shrink-0 relative"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #fafaf9 100%)',
        borderBottom: '1px solid #e7e5e4',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div className="flex items-center justify-between h-full px-8">
        {/* Left side - Title */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-4">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#1c1917',
                letterSpacing: '-0.025em',
              }}
            >
              {title}
            </h1>

            {/* Subtle breadcrumb indicator for nested pages */}
            {location.pathname.includes('/admin') && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                style={{
                  background: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
                  color: '#78716c',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid #d6d3d1',
                }}
              >
                Admin
              </span>
            )}
          </div>

          {/* Description with subtle styling */}
          {description && (
            <p
              className="text-sm mt-2 leading-relaxed max-w-xl"
              style={{
                fontFamily: 'var(--font-body)',
                color: '#a8a29e',
                fontWeight: '400',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Right side - Actions and User */}
        <div className="flex items-center gap-4">
          {/* Search button */}
          <button
            className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
            style={{
              background: '#fafaf9',
              border: '1px solid #e7e5e4',
            }}
          >
            <svg
              className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span
              className="text-sm text-stone-400 group-hover:text-stone-600 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Search...
            </span>
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-xs font-mono"
              style={{
                background: '#e7e5e4',
                color: '#78716c',
              }}
            >
              ⌘K
            </span>
          </button>

          {/* Notification bell */}
          <button
            className="relative p-2.5 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: '#fafaf9',
              border: '1px solid #e7e5e4',
            }}
          >
            <svg
              className="w-5 h-5 text-stone-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Notification dot */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: '#ef4444' }}
            />
          </button>

          {/* User avatar */}
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 100%)',
              border: '1px solid #d6d3d1',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                color: 'white',
                fontFamily: 'var(--font-display)',
              }}
            >
              A
            </div>
            <div className="hidden md:block">
              <p
                className="text-sm font-medium leading-tight"
                style={{
                  color: '#1c1917',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Admin User
              </p>
              <p
                className="text-xs"
                style={{ color: '#a8a29e', fontFamily: 'var(--font-mono)' }}
              >
                Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}