import { ReactNode, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  // Apply page entrance animation on mount
  useEffect(() => {
    document.body.classList.add('page-enter')
    return () => {
      document.body.classList.remove('page-enter')
    }
  }, [])

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#fafaf8' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}