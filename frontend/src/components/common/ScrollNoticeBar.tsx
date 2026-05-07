import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEnabledScrollNotices, ScrollNotice } from '../../api/scrollNotice'

// Speed to pixels per frame mapping
const SPEED_MAP = { 1: 2, 2: 3, 3: 5 }

// Check if scroll notice feature is enabled in admin settings
const checkScrollNoticeEnabled = (): boolean => {
  if (globalThis.window === undefined) return true
  try {
    const stored = localStorage.getItem('pod_admin_settings')
    if (stored && typeof stored === 'string') {
      const settings = JSON.parse(stored)
      if (settings && typeof settings === 'object') {
        return settings.scrollNoticeEnabled !== false
      }
    }
  } catch {
    // If localStorage is corrupted, just show the bar
  }
  return true // Default to enabled
}

export default function ScrollNoticeBar() {
  const [isPaused, setIsPaused] = useState(false)
  const [offset, setOffset] = useState(0)
  const animationRef = useRef<number>()

  // Check feature setting - use useState to keep hooks consistent
  const [isEnabled] = useState(() => checkScrollNoticeEnabled())

  // Poll for updates every 10 seconds - always call useQuery
  const { data: notices = [] } = useQuery({
    queryKey: ['scrollNotices', 'enabled'],
    queryFn: async () => {
      try {
        return await getEnabledScrollNotices()
      } catch {
        // API not available, return empty array
        return [] as ScrollNotice[]
      }
    },
    refetchInterval: 10000,
    placeholderData: [],
  })

  // Process notices - always call useMemo so hooks order is consistent
  const { firstNotice, direction, speedPx, contentWidth, displayContent } = useMemo(() => {
    const valid = notices.filter((n: ScrollNotice) => n.content)
    const first = valid[0]

    if (!first) {
      return {
        firstNotice: undefined as ScrollNotice | undefined,
        direction: 1,
        speedPx: 3,
        contentWidth: 1000,
        displayContent: ''
      }
    }

    const spd = first.speed || 2
    const dir = first.direction || 1
    const spdPx = SPEED_MAP[spd as keyof typeof SPEED_MAP] || 3

    const chars = valid.reduce((sum: number, n: ScrollNotice) => sum + n.content.length + 4, 0)
    const width = chars * 9 + 120
    const content = valid.map((n: ScrollNotice) => n.content).join('   ●   ')

    return {
      firstNotice: first,
      direction: dir,
      speedPx: spdPx,
      contentWidth: width,
      displayContent: content
    }
  }, [notices])

  // Only show if feature is enabled AND there are notices
  const shouldShow = isEnabled && firstNotice

  // Animation effect - only runs when shouldShow is true
  useEffect(() => {
    if (!shouldShow) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    if (isPaused) {
      return
    }

    const animate = () => {
      setOffset(prev => {
        const newOffset = direction === 1
          ? prev - speedPx
          : prev + speedPx

        if (direction === 1 && newOffset < -contentWidth) {
          return contentWidth
        }
        if (direction === 2 && newOffset > contentWidth) {
          return -contentWidth
        }
        return newOffset
      })
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [shouldShow, isPaused, contentWidth, speedPx, direction])

  if (!shouldShow) {
    return null
  }

  return (
    <section
      className="relative w-full h-11 flex items-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
      }}
      aria-label="Scrolling announcements"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Subtle animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.1), transparent)',
          animation: 'shimmer 3s infinite',
        }}
      />

      {/* Notification icon */}
      <div className="absolute left-4 z-10 flex items-center gap-2">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20">
          <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Scrolling content */}
      <div
        className="absolute whitespace-nowrap"
        style={{
          transform: `translateX(${offset}px)`,
          paddingLeft: '60px',
        }}
      >
        <span
          className="text-sm font-medium tracking-wide"
          style={{
            color: '#e0f2fe',
            fontFamily: 'var(--font-body)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {displayContent}
        </span>
      </div>

      {/* Fade edges for seamless effect */}
      <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(90deg, #0f172a 0%, transparent 100%)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none" style={{ background: 'linear-gradient(270deg, #0f172a 0%, transparent 100%)' }} />

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  )
}