'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Attendance } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function AttendanceButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null)
  const [workingTime, setWorkingTime] = useState('')
  const supabase = createClient()

  useEffect(() => {
    checkCurrentAttendance()
    const interval = setInterval(() => {
      if (currentAttendance?.check_in && !currentAttendance.check_out) {
        updateWorkingTime()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentAttendance])

  const checkCurrentAttendance = async () => {
    const response = await fetch('/api/attendance')
    const result = await response.json()
    
    if (result.data) {
      setCurrentAttendance(result.data)
    }
  }

  const updateWorkingTime = () => {
    if (currentAttendance?.check_in) {
      const now = new Date()
      const checkIn = new Date(currentAttendance.check_in)
      const diff = now.getTime() - checkIn.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setWorkingTime(`${hours}h ${minutes}m ${seconds}s`)
    }
  }

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })
  }

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    setLoading(true)
    setMessage('')
    
    try {
      const position = await getLocation()
      const { latitude, longitude } = position.coords

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, latitude, longitude })
      })

      const result = await response.json()
      
      if (response.ok) {
        setMessage(`✓ ${type === 'check-in' ? 'Checked in' : 'Checked out'} successfully!`)
        setTimeout(() => {
          checkCurrentAttendance()
          setMessage('')
        }, 2000)
      } else {
        setMessage(`✗ ${result.error || 'An error occurred'}`)
      }
    } catch (error) {
      setMessage(`✗ Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const isCheckedIn = !!(currentAttendance && !currentAttendance.check_out)
  const isCheckedOut = !!currentAttendance?.check_out

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="p-4 bg-muted rounded-lg">
          {isCheckedIn && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  Checked In
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Working Time:</span>
                <span className="text-lg font-bold text-primary">{workingTime}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Check-in: {new Date(currentAttendance.check_in).toLocaleTimeString()}
              </div>
            </div>
          )}
          
          {isCheckedOut && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="secondary">
                  Checked Out
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <div>Check-in: {new Date(currentAttendance.check_in).toLocaleTimeString()}</div>
                <div>Check-out: {new Date(currentAttendance.check_out!).toLocaleTimeString()}</div>
              </div>
            </div>
          )}
          
          {!currentAttendance && (
            <div className="text-center text-muted-foreground">
              No attendance record for today
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => handleAttendance('check-in')}
            disabled={loading || isCheckedIn || isCheckedOut}
            className="flex-1 bg-green-500 hover:bg-green-600"
            size="lg"
          >
            Check In
          </Button>
          <Button
            onClick={() => handleAttendance('check-out')}
            disabled={loading || !isCheckedIn || isCheckedOut}
            variant="destructive"
            size="lg"
            className="flex-1"
          >
            Check Out
          </Button>
        </div>
        
        {message && (
          <div className={`p-3 rounded-lg text-sm text-center ${
            message.startsWith('✓') 
              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
              : 'bg-destructive/10 text-destructive'
          }`}>
            {message}
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          📍 GPS location will be captured automatically
        </div>
      </CardContent>
    </Card>
  )
}
