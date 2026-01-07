'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import AttendanceButton from '@/components/AttendanceButton'
import AttendanceHistory from '@/components/AttendanceHistory'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user?.id) {
      fetchProfile()
    }
  }, [session, status])

  const fetchProfile = async () => {
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
  }

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Attendance System</h1>
            <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name || session?.user?.name}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee ID:</span>
                <span className="font-medium">{profile?.employee_id || session?.user?.employeeId || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{profile?.email || session?.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{profile?.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-medium">{profile?.position || '-'}</span>
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
      </main>
    </div>
  )
}
