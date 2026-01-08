'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Attendance } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function AttendanceButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null)
  const [schedule, setSchedule] = useState<any>(null)
  const [workingTime, setWorkingTime] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in')
  const [locationInfo, setLocationInfo] = useState<{ lat: number; lng: number } | null>(null)
  const [locationWarning, setLocationWarning] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const supabase = createClient()

  // Format time from HH:MM:SS or HH:MM to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Fetch attendance status once on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [attendanceRes, scheduleRes] = await Promise.all([
          fetch('/api/attendance'),
          fetch('/api/schedule')
        ])

        const [attendanceData, scheduleData] = await Promise.all([
          attendanceRes.json(),
          scheduleRes.json()
        ])

        if (attendanceData.data) {
          setCurrentAttendance(attendanceData.data)
        }
        if (scheduleData.data) {
          setSchedule(scheduleData.data)
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchInitialData()
  }, []) // Empty dependency array - only runs once on mount

  // Update working time every second if checked in
  useEffect(() => {
    if (!currentAttendance?.check_in || currentAttendance?.check_out) {
      return
    }

    updateWorkingTime()
    const interval = setInterval(updateWorkingTime, 1000)
    return () => clearInterval(interval)
  }, [currentAttendance])

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
        reject(new Error('Geolocation not supported by your browser'))
      }
      
      // Try high accuracy first
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          // If high accuracy fails, try with lower accuracy
          if (error.code === error.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 60000 // Accept location up to 1 minute old
              }
            )
          } else {
            reject(error)
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased to 15 seconds
          maximumAge: 30000 // Accept cached location up to 30 seconds old
        }
      )
    })
  }

  const showConfirmation = async (type: 'check-in' | 'check-out') => {
    setActionType(type)
    setLoading(true)
    setMessage('📍 Getting your location...')
    
    try {
      const position = await getLocation()
      const { latitude, longitude } = position.coords
      setLocationInfo({ lat: latitude, lng: longitude })
      setMessage('')
      setShowConfirmDialog(true)
    } catch (error: any) {
      let errorMessage = 'Unable to get your location'
      
      if (error.code === 1) {
        errorMessage = '✗ Location permission denied. Please enable location access in your browser settings.'
      } else if (error.code === 2) {
        errorMessage = '✗ Location unavailable. Please check your GPS/location settings.'
      } else if (error.code === 3) {
        errorMessage = '✗ Location request timed out. Please try again or move to an area with better GPS signal.'
      } else if (error.message) {
        errorMessage = `✗ ${error.message}`
      }
      
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendance = async () => {
    if (!locationInfo) return
    
    setShowConfirmDialog(false)
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: actionType, 
          latitude: locationInfo.lat, 
          longitude: locationInfo.lng 
        })
      })

      const result = await response.json()
      
      if (response.ok && result.data) {
        // Supabase returns data as an array, get the first item
        const attendanceRecord = Array.isArray(result.data) ? result.data[0] : result.data
        
        let successMessage = `✓ ${actionType === 'check-in' ? 'Checked in' : 'Checked out'} successfully!`
        let warnings: string[] = []
        
        // Check for late check-in
        if (actionType === 'check-in' && result.status === 'late') {
          warnings.push('⏰ Late Arrival: You checked in more than 15 minutes after your scheduled start time.')
        }
        
        // Check for early checkout
        if (actionType === 'check-out' && result.isEarlyCheckout) {
          warnings.push('⏰ Early Checkout: You checked out more than 15 minutes before your scheduled end time.')
        }
        
        // Check for invalid location
        if (!result.locationValid) {
          const distanceKm = (result.distance / 1000).toFixed(2)
          warnings.push(
            `📍 Location Warning: You are ${distanceKm}km away from ${result.nearestLocation || 'the nearest location'}.\n` +
            `Your attendance was recorded but flagged for review by management.`
          )
        }
        
        // Set warnings if any
        if (warnings.length > 0) {
          setLocationWarning(warnings.join('\n\n'))
        } else {
          setLocationWarning(null)
        }
        
        setMessage(successMessage)
        setCurrentAttendance(attendanceRecord)
        
        setTimeout(() => {
          setMessage('')
          if (result.locationValid) {
            setLocationWarning(null)
          }
        }, 5000)
      } else {
        setMessage(`✗ ${result.error || 'An error occurred'}`)
      }
    } catch (error) {
      setMessage(`✗ Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
      setLocationInfo(null)
    }
  }

  const isCheckedIn = !!(currentAttendance && !currentAttendance.check_out)
  const isCheckedOut = !!currentAttendance?.check_out

  if (initialLoading) {
    return (
      <Card className="overflow-hidden border-2">
        <CardHeader className="py-3 sm:py-6">
          <CardTitle className="text-base sm:text-xl">Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading attendance status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden border-2">
        <div className="relative">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 animate-pulse" />
          
          <CardHeader className="relative py-3 sm:py-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-xl">Today's Attendance</CardTitle>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Live</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-6">
            {/* Schedule Information */}
            {schedule && schedule.shift_start && schedule.shift_end ? (
              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">Today's Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600/70 dark:text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-[9px] sm:text-xs text-muted-foreground">Start</p>
                      <p className="text-xs sm:text-sm font-semibold">{formatTime(schedule.shift_start)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600/70 dark:text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-[9px] sm:text-xs text-muted-foreground">End</p>
                      <p className="text-xs sm:text-sm font-semibold">{formatTime(schedule.shift_end)}</p>
                    </div>
                  </div>
                </div>
                {schedule.work_locations && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600/70 dark:text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Location: <span className="font-medium text-foreground">{schedule.work_locations.name}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">No Schedule Defined</p>
                    <p className="text-[10px] sm:text-xs text-amber-700/80 dark:text-amber-300/80">
                      You don't have a schedule set for today. You can still check in/out, but your attendance may need manager approval.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Display with fancy design */}
            <div className="relative">
              {isCheckedIn && (
                <div className="p-3 sm:p-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 sm:border-2 backdrop-blur-sm">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                          <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">Status</p>
                          <Badge variant="default" className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs">
                            🟢 Checked In
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] sm:text-xs text-muted-foreground">Started at</p>
                        <p className="text-xs sm:text-sm font-semibold">{new Date(currentAttendance.check_in).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 sm:pt-4 border-t border-primary/20">
                      <div className="text-center">
                        <p className="text-[10px] sm:text-sm text-muted-foreground mb-1 sm:mb-2">Working Duration</p>
                        <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                          {workingTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isCheckedOut && (
                <div className="p-3 sm:p-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 sm:border-2">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-sm text-muted-foreground">Status</p>
                        <Badge variant="secondary" className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs">
                          ⚪ Checked Out
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2 sm:pt-4 border-t">
                      <div>
                        <p className="text-[9px] sm:text-xs text-muted-foreground">Check In</p>
                        <p className="text-xs sm:text-sm font-semibold">{new Date(currentAttendance.check_in).toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-xs text-muted-foreground">Check Out</p>
                        <p className="text-xs sm:text-sm font-semibold">{new Date(currentAttendance.check_out!).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!currentAttendance && (
                <div className="p-4 sm:p-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-dashed sm:border-2 border-muted-foreground/20 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground font-medium">Ready to start your day?</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/60 mt-0.5 sm:mt-1">Check in to begin tracking</p>
                  
                  {schedule && (
                    <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Today's Schedule</p>
                      <p className="text-xs sm:text-sm font-semibold text-primary">
                        🕐 {schedule.shift_start.slice(0, 5)} - {schedule.shift_end.slice(0, 5)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons with icons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <Button
                onClick={() => showConfirmation('check-in')}
                disabled={loading || isCheckedIn || isCheckedOut}
                className="h-10 sm:h-14 text-xs sm:text-base font-semibold transition-all hover:scale-105 shadow-md sm:shadow-lg"
                size="lg"
              >
                {loading && actionType === 'check-in' ? (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-xs sm:text-base">Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-xs sm:text-base">Check In</span>
                  </div>
                )}
              </Button>
              <Button
                onClick={() => showConfirmation('check-out')}
                disabled={loading || !isCheckedIn || isCheckedOut}
                variant="outline"
                className="h-10 sm:h-14 text-xs sm:text-base font-semibold transition-all hover:scale-105 shadow-md sm:shadow-lg border sm:border-2"
                size="lg"
              >
                {loading && actionType === 'check-out' ? (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span className="text-xs sm:text-base">Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-xs sm:text-base">Check Out</span>
                  </div>
                )}
              </Button>
            </div>
            
            {message && (
              <div className={`p-2 sm:p-4 rounded-lg sm:rounded-xl text-center border sm:border-2 font-medium text-xs sm:text-base animate-in fade-in slide-in-from-bottom-2 ${
                message.startsWith('✓') 
                  ? 'bg-primary/10 text-primary border-primary/20 shadow-md sm:shadow-lg shadow-primary/10' 
                  : 'bg-destructive/10 text-destructive border-destructive/20 shadow-md sm:shadow-lg shadow-destructive/10'
              }`}>
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  {message.startsWith('✓') ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span>{message}</span>
                </div>
              </div>
            )}
            
            {locationWarning && (
              <div className="p-2 sm:p-4 rounded-lg bg-yellow-500/10 border sm:border-2 border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
                <div className="font-semibold text-xs sm:text-base mb-1 sm:mb-2">⚠️ Location Warning</div>
                <div className="text-[10px] sm:text-sm whitespace-pre-line">{locationWarning}</div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1 sm:gap-2 text-[9px] sm:text-xs text-muted-foreground bg-muted/50 rounded-md sm:rounded-lg p-2 sm:p-3">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>GPS location verified automatically</span>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl">
              {actionType === 'check-in' ? '🟢 Check In' : '🔴 Check Out'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {actionType === 'check-in'
                ? 'Are you ready to start your work day?'
                : 'Are you ready to end your work day?'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 sm:space-y-4 py-2 sm:py-4">
            <div className="p-2 sm:p-4 rounded-lg bg-muted/50 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">Time</p>
                  <p className="text-sm sm:text-lg font-bold">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Location</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {locationInfo ? `${locationInfo.lat.toFixed(4)}, ${locationInfo.lng.toFixed(4)}` : 'Detecting...'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">Date</p>
                  <p className="text-xs sm:text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground text-center px-2 sm:px-4">
              {actionType === 'check-in'
                ? 'Your attendance will be recorded with the current time and GPS location.'
                : 'This will mark the end of your work shift for today.'}
            </p>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setLocationInfo(null)
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttendance}
              disabled={!locationInfo}
              className="w-full sm:w-auto font-semibold"
            >
              {actionType === 'check-in' ? 'Confirm Check In' : 'Confirm Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
