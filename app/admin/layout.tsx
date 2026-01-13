'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hrDropdownOpen, setHrDropdownOpen] = useState(false)
  const [reportingDropdownOpen, setReportingDropdownOpen] = useState(false)
  const [managementDropdownOpen, setManagementDropdownOpen] = useState(false)
  const hrDropdownRef = useRef<HTMLDivElement>(null)
  const reportingDropdownRef = useRef<HTMLDivElement>(null)
  const managementDropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') {
      return
    }
    
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'employee') {
        router.push('/dashboard')
      } else {
        fetchProfile()
      }
    }
  }, [session, status, router])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hrDropdownRef.current && !hrDropdownRef.current.contains(event.target as Node)) {
        setHrDropdownOpen(false)
      }
      if (reportingDropdownRef.current && !reportingDropdownRef.current.contains(event.target as Node)) {
        setReportingDropdownOpen(false)
      }
      if (managementDropdownRef.current && !managementDropdownRef.current.contains(event.target as Node)) {
        setManagementDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchProfile = async () => {
    if (!session?.user?.id) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data) {
      if (data.role === 'employee') {
        router.push('/dashboard')
        return
      }
      setProfile(data)
    } else {
      // If no profile found or error, redirect to login
      router.push('/login')
      return
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const isActive = (path: string) => pathname === path

  if (loading || status === 'loading' || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Double check: only allow admins and managers
  if (profile.role === 'employee') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8 flex-1">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold">Admin Panel</h1>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  Dashboard
                </Link>
                
                {/* Human Resources Dropdown */}
                <div className="relative" ref={hrDropdownRef}>
                  <button
                    onClick={() => setHrDropdownOpen(!hrDropdownOpen)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                      pathname?.includes('/admin/employees') || 
                      pathname?.includes('/admin/attendance')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    Human Resources
                    <svg 
                      className={`w-4 h-4 transition-transform ${hrDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {hrDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card border rounded-md shadow-lg py-1 z-50">
                      <Link
                        href="/admin/employees"
                        onClick={() => setHrDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/employees')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Employees
                      </Link>
                      <Link
                        href="/admin/attendance"
                        onClick={() => setHrDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/attendance')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Attendance
                      </Link>
                    </div>
                  )}
                </div>
                
                {/* Reporting Dropdown */}
                <div className="relative" ref={reportingDropdownRef}>
                  <button
                    onClick={() => setReportingDropdownOpen(!reportingDropdownOpen)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                      pathname?.includes('/admin/reports')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    Reporting
                    <svg 
                      className={`w-4 h-4 transition-transform ${reportingDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {reportingDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card border rounded-md shadow-lg py-1 z-50">
                      <Link
                        href="/admin/reports"
                        onClick={() => setReportingDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/reports')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Reports
                      </Link>
                    </div>
                  )}
                </div>
                
                {/* Management Dropdown */}
                <div className="relative" ref={managementDropdownRef}>
                  <button
                    onClick={() => setManagementDropdownOpen(!managementDropdownOpen)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                      pathname?.includes('/admin/schedules') || 
                      pathname?.includes('/admin/locations') || 
                      pathname?.includes('/admin/job-templates') || 
                      pathname?.includes('/admin/job-checklists')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    Management
                    <svg 
                      className={`w-4 h-4 transition-transform ${managementDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {managementDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-card border rounded-md shadow-lg py-1 z-50">
                      <Link
                        href="/admin/schedules"
                        onClick={() => setManagementDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/schedules')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Schedules
                      </Link>
                      <Link
                        href="/admin/locations"
                        onClick={() => setManagementDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/locations')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Locations
                      </Link>
                      <Link
                        href="/admin/job-templates"
                        onClick={() => setManagementDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/job-templates')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Job Templates
                      </Link>
                      <Link
                        href="/admin/job-checklists"
                        onClick={() => setManagementDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActive('/admin/job-checklists')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        Job Checklists
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right side items */}
            <div className="flex items-center space-x-4">
              {/* User info - hidden on mobile */}
              <div className="hidden sm:block text-sm text-right">
                <div className="font-medium">{profile?.full_name || session?.user?.name}</div>
                <div className="text-muted-foreground text-xs">{profile?.role || session?.user?.role}</div>
              </div>
              
              {/* Logout button - hidden on mobile */}
              <button
                onClick={handleLogout}
                className="hidden sm:block text-sm text-destructive hover:text-destructive/80 font-medium px-3 py-2 rounded-md hover:bg-destructive/10 transition-colors"
              >
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-accent"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t mt-2 pt-4">
              <div className="space-y-2">
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  📊 Dashboard
                </Link>
                <Link
                  href="/admin/employees"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/employees')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  👥 Employees
                </Link>
                <Link
                  href="/admin/attendance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/attendance')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  📋 Attendance
                </Link>
                <Link
                  href="/admin/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/reports')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  📈 Reports
                </Link>
                <Link
                  href="/admin/schedules"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/schedules')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  🗓️ Schedules
                </Link>
                <Link
                  href="/admin/locations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/locations')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  📍 Locations
                </Link>
                <Link
                  href="/admin/job-templates"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/job-templates')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  📝 Job Templates
                </Link>
                <Link
                  href="/admin/job-checklists"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive('/admin/job-checklists')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  ✅ Job Checklists
                </Link>
                
                {/* Mobile user info and logout */}
                <div className="pt-4 mt-4 border-t">
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium">{profile?.full_name || session?.user?.name}</div>
                    <div className="text-muted-foreground text-xs">{profile?.role || session?.user?.role}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
