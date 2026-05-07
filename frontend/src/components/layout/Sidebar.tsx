import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/resources', label: 'Resources', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { to: '/projects', label: 'Projects', icon: 'M9 12h6M12 9v6M3 20h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { to: '/projects/actuals', label: 'Project Actuals', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/allocations', label: 'Allocations', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/rates', label: 'Rates', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
]

const adminItems = [
  { to: '/admin/filters', label: 'Standard Data' },
  { to: '/admin/scroll-notices', label: 'Scroll Notices' },
  { to: '/admin/settings', label: 'Settings' },
]

function Sidebar() {
  const [adminExpanded, setAdminExpanded] = useState(true)

  return (
    <aside
      className="flex flex-col"
      style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#0f172a',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #209d9d 0%, #0D4F4F 100%)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            color: 'white',
            letterSpacing: '0.1em'
          }}
        >
          POD
        </div>
        <div>
          <span
            className="block text-xs font-medium tracking-widest"
            style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}
          >
            MANAGEMENT
          </span>
          <span
            className="block text-[10px]"
            style={{ color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}
          >
            Team System v1.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/projects' || item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-700 to-brand-600'
                  : 'hover:bg-white/5'
              }`
            }
            style={({ isActive }) => ({
              ...(isActive
                ? {
                    background: 'linear-gradient(135deg, rgba(32, 158, 157, 0.3) 0%, rgba(32, 158, 157, 0.15) 100%)',
                    boxShadow: 'inset 3px 0 0 #209d9d'
                  }
                : {})
            })}
          >
            <svg
              className="w-[18px] h-[18px] shrink-0"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            <span
              className="text-sm font-medium"
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'var(--font-body)'
              }}
            >
              {item.label}
            </span>
          </NavLink>
        ))}

        {/* Admin Section */}
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setAdminExpanded(!adminExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-[18px] h-[18px]"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span
                className="text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Admin
              </span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${adminExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'rgba(255,255,255,0.3)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {adminExpanded && (
            <div className="mt-1 space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 ml-6 rounded-lg text-sm transition-all duration-200 ${
                      isActive ? 'bg-white/10' : 'hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)',
                    ...(isActive ? { borderLeft: '2px solid #209d9d' } : {})
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer User */}
      <div
        className="px-4 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #ee961f 0%, #cb7819 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '12px',
              fontFamily: 'var(--font-display)'
            }}
          >
            AU
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-sm truncate"
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 500,
                fontFamily: 'var(--font-body)'
              }}
            >
              Admin User
            </div>
            <div
              className="text-xs truncate mono-text"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              ADMIN
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar