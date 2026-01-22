'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { getFCMToken, onMessageListener } from '@/lib/firebase'
import AttendanceButton from '@/components/AttendanceButton'
import AttendanceHistory from '@/components/AttendanceHistory'
import JobChecklist from '@/components/JobChecklist'
import NotificationsList from '@/components/NotificationsList'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TabType = 'attendance' | 'checkin' | 'jobs' | 'notifications' | 'profile'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCheckedSession, setHasCheckedSession] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('checkin')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [showNotificationBanner, setShowNotificationBanner] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setProfile(data)
    }
    setLoading(false)
  }, [session?.user?.id])

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch('/api/notifications/unread-count')
      const result = await response.json()
      setUnreadCount(result.count || 0)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }, [session?.user?.id])

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        setShowNotificationBanner(false)
        
        // Try to get FCM token and register it (optional - may fail)
        const token = await getFCMToken()
        if (token) {
          try {
            await fetch('/api/notifications/fcm-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token,
                device_type: 'web',
                device_info: navigator.userAgent
              })
            })
            alert('✅ Push notifications enabled! You will receive updates from management.')
          } catch (err) {
            console.error('Failed to register FCM token:', err)
            alert('✅ Notifications enabled! (In-app notifications only)')
          }
        } else {
          // FCM not available, but browser notifications still work
          alert('✅ Notifications enabled! (In-app notifications only)')
        }
      } else if (permission === 'denied') {
        setShowNotificationBanner(false)
        alert('⚠️ Notifications blocked. You can enable them in your browser settings.')
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }

  useEffect(() => {
    if (status === 'loading') {
      return
    }
    
    setHasCheckedSession(true)
    
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'admin' || session.user.role === 'manager') {
        router.push('/admin')
        return
      }
      
      fetchProfile()
    }
  }, [session?.user?.id, session?.user?.role, status, fetchProfile, router])

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
      
      // Show banner if permission not granted
      if (Notification.permission === 'default') {
        setShowNotificationBanner(true)
      }
    }
  }, [])

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadCount()
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [session?.user?.id, fetchUnreadCount])

  // Listen for foreground FCM messages
  useEffect(() => {
    if (typeof window === 'undefined') return

    onMessageListener()
      .then((payload: any) => {
        console.log('Received foreground message:', payload)
        // Show notification
        if (payload.notification) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/icon-192x192.png'
          })
        }
        // Refresh notifications list and unread count
        fetchUnreadCount()
      })
      .catch((err) => console.error('Failed to receive message:', err))
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Notification Permission Banner */}
      {showNotificationBanner && (
        <div className="bg-blue-500 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="font-medium">Enable notifications to receive important updates from management</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={requestNotificationPermission}
              size="sm"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Enable
            </Button>
            <Button 
              onClick={() => setShowNotificationBanner(false)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-blue-600"
            >
              Later
            </Button>
          </div>
        </div>
      )}

      {/* Desktop View */}
      <div className="hidden md:block">
        {/* Header with gradient */}
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Attendance System</h1>
                    <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name || session?.user?.name} 👋</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </Button>
              </div>
            </div>
          </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card with enhanced design */}
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <CardTitle>Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Employee ID</span>
                      <p className="font-semibold">{profile?.employee_id || session?.user?.employeeId || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <p className="font-semibold text-sm truncate">{profile?.email || session?.user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Department</span>
                      <p className="font-semibold">{profile?.department || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Position</span>
                      <p className="font-semibold">{profile?.position || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Actions */}
            <div className="lg:col-span-2">
              <AttendanceButton />
            </div>
          </div>

          {/* Attendance History */}
          <div className="mt-8">
            <AttendanceHistory />
          </div>

          {/* Job Checklist */}
          <div className="mt-8">
            <JobChecklist />
          </div>

          {/* Notifications */}
          <div className="mt-8">
            <NotificationsList />
          </div>
        </main>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Mobile Header */}
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">Attendance</h1>
                <p className="text-xs text-muted-foreground">{profile?.full_name || session?.user?.name}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-destructive"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Button>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto pb-20 px-4 py-4">
          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">This Month's Attendance</h2>
              <AttendanceHistory />
            </div>
          )}

          {/* Check In/Out Tab */}
          {activeTab === 'checkin' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Check In/Out</h2>
              <AttendanceButton />
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Today's Jobs</h2>
              <JobChecklist />
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Notifications</h2>
              <NotificationsList />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">My Profile</h2>
              <Card className="border-2">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold">{profile?.full_name || session?.user?.name}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.position || '-'}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Employee ID</span>
                        <p className="font-semibold">{profile?.employee_id || session?.user?.employeeId || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Email</span>
                        <p className="font-semibold text-sm break-all">{profile?.email || session?.user?.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Department</span>
                        <p className="font-semibold">{profile?.department || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
          <div className="flex items-center justify-around h-16">
            {/* Attendance Tab */}
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'attendance'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="text-xs font-medium">Attendance</span>
            </button>

            {/* Check In/Out Tab */}
            <button
              onClick={() => setActiveTab('checkin')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'checkin'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium">Check In/Out</span>
            </button>
            {/* Jobs Tab */}
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
                activeTab === 'jobs'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-xs font-medium">Jobs</span>
            </button>

            {/* Notifications Tab */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
                activeTab === 'notifications'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-xs font-medium">Notifications</span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'profile'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
