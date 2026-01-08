'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugJobsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDebug = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/debug-jobs')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Debug fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebug()
  }, [])

  if (loading) return <div className="p-8">Loading debug data...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Job Checklist Debug</h1>
        <Button onClick={fetchDebug}>Refresh</Button>
      </div>

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-auto">{JSON.stringify(data.debug, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Schedules for Today ({data.schedules?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.schedules?.length > 0 ? (
                <pre className="text-sm overflow-auto">{JSON.stringify(data.schedules, null, 2)}</pre>
              ) : (
                <p className="text-red-600">❌ No schedule found for today! You need a schedule to see jobs.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Locations & Areas ({data.locations?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-auto">{JSON.stringify(data.locations, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Templates ({data.templates?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.templates?.length > 0 ? (
                <pre className="text-sm overflow-auto">{JSON.stringify(data.templates, null, 2)}</pre>
              ) : (
                <p className="text-red-600">❌ No job templates found! Create templates in Admin → Job Templates.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Checklists for Today ({data.checklists?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.checklists?.length > 0 ? (
                <pre className="text-sm overflow-auto">{JSON.stringify(data.checklists, null, 2)}</pre>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-600">❌ No job checklists generated for today!</p>
                  <p className="text-sm text-muted-foreground">
                    Go to <strong>Admin → Job Templates</strong> and click <strong>"Generate Today's Jobs"</strong> button.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.errors && Object.values(data.errors).some((e: any) => e) && (
            <Card>
              <CardHeader>
                <CardTitle>Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-red-600 overflow-auto">{JSON.stringify(data.errors, null, 2)}</pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
