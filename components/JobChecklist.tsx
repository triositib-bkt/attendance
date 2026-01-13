'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface JobChecklistItem {
  id: string
  assigned_date: string
  start_time: string | null
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  start_photo_url: string | null
  end_photo_url: string | null
  job_template: {
    title: string
    description: string | null
    frequency: string
  }
  office_area: {
    name: string
    duration_minutes: number | null
    location: {
      name: string
    }
  }
  completed_by_profile?: {
    full_name: string
  }
}

export default function JobChecklist() {
  const [jobs, setJobs] = useState<JobChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showUndoModal, setShowUndoModal] = useState(false)
  const [cameraAction, setCameraAction] = useState<'start' | 'end'>('start')
  const [selectedJob, setSelectedJob] = useState<JobChecklistItem | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const toggleArea = (areaName: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(areaName)) {
        newSet.delete(areaName)
      } else {
        newSet.add(areaName)
      }
      return newSet
    })
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    // Cleanup camera stream when modal closes
    if (!showCameraModal && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [showCameraModal])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error('Failed to start camera:', error)
      setMessage({ type: 'error', text: 'Failed to access camera' })
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedPhoto(photoData)
      }
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
  }

  const uploadPhoto = async (photoData: string, jobId: string, type: 'start' | 'end'): Promise<string | null> => {
    try {
      // Upload through API endpoint instead of direct Supabase client
      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoData,
          jobId,
          type
        })
      })

      const result = await response.json()

      if (!response.ok || !result.url) {
        console.error('Upload error:', result.error)
        return null
      }

      return result.url
    } catch (error) {
      console.error('Failed to upload photo:', error)
      return null
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/job-checklists')
      const result = await response.json()
      setJobs(result.data || [])
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteClick = (job: JobChecklistItem) => {
    // If not started yet, show camera modal for start photo
    if (!job.start_time) {
      setSelectedJob(job)
      setCameraAction('start')
      setShowCameraModal(true)
      setTimeout(() => startCamera(), 100)
      return
    }
    // Show camera modal for end photo
    setSelectedJob(job)
    setCameraAction('end')
    setShowCameraModal(true)
    setTimeout(() => startCamera(), 100)
  }

  const handleCameraSubmit = async () => {
    if (!selectedJob || !capturedPhoto) return

    setUploadingPhoto(true)
    setMessage(null)

    try {
      const photoUrl = await uploadPhoto(capturedPhoto, selectedJob.id, cameraAction)
      
      if (!photoUrl) {
        setMessage({ type: 'error', text: 'Failed to upload photo' })
        setUploadingPhoto(false)
        return
      }

      if (cameraAction === 'start') {
        // Start the job with photo
        const response = await fetch(`/api/job-checklists/${selectedJob.id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl }),
        })

        const result = await response.json()

        if (response.ok) {
          fetchJobs()
          setShowCameraModal(false)
          setCapturedPhoto(null)
          setSelectedJob(null)
          setMessage({ type: 'success', text: 'Job started with photo!' })
          setTimeout(() => setMessage(null), 2000)
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to start job' })
        }
      } else {
        // Complete the job with photo - show notes modal
        setShowCameraModal(false)
        setCapturedPhoto(null)
        // Store photo URL temporarily
        selectedJob.end_photo_url = photoUrl
        setShowCompleteModal(true)
      }
    } catch (error) {
      console.error('Failed to process photo:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleStartJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/job-checklists/${jobId}/start`, {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        fetchJobs()
        setMessage({ type: 'success', text: 'Job started!' })
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to start job' })
      }
    } catch (error) {
      console.error('Failed to start job:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    }
  }

  const handleComplete = async () => {
    if (!selectedJob) return

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/job-checklists/${selectedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes: notes || null,
          endPhotoUrl: selectedJob.end_photo_url || null
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowCompleteModal(false)
        setSelectedJob(null)
        setNotes('')
        fetchJobs()
        setMessage({ type: 'success', text: 'Job completed successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to complete job' })
      }
    } catch (error) {
      console.error('Failed to complete job:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUncomplete = async (action: 'restart' | 'in-progress') => {
    if (!selectedJob) return

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/job-checklists/${selectedJob.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowUndoModal(false)
        setSelectedJob(null)
        fetchJobs()
        const message = action === 'restart' 
          ? 'Job restarted - ready to begin again'
          : 'Job marked as in progress'
        setMessage({ type: 'success', text: message })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to undo completion' })
      }
    } catch (error) {
      console.error('Failed to undo job:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const completedJobs = jobs.filter(j => j.completed_at)
  const pendingJobs = jobs.filter(j => !j.completed_at)
  const completionRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0

  // Group jobs by area
  const groupJobsByArea = (jobList: JobChecklistItem[]) => {
    const grouped = new Map<string, { area: typeof jobList[0]['office_area'], jobs: JobChecklistItem[] }>()
    
    jobList.forEach(job => {
      const areaId = job.office_area.name
      if (!grouped.has(areaId)) {
        grouped.set(areaId, { area: job.office_area, jobs: [] })
      }
      grouped.get(areaId)!.jobs.push(job)
    })
    
    return Array.from(grouped.values())
  }

  const groupedPendingJobs = groupJobsByArea(pendingJobs)
  const groupedCompletedJobs = groupJobsByArea(completedJobs)

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-lg">Loading your jobs...</div>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Jobs</CardTitle>
          <CardDescription>No jobs assigned for today</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You don't have any scheduled jobs for today. Check back when you're scheduled at a location with job assignments.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today's Jobs</CardTitle>
              <CardDescription>{jobs.length} total tasks</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Completed: </span>
              <span className="font-semibold text-green-600">{completedJobs.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pending: </span>
              <span className="font-semibold text-orange-600">{pendingJobs.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pending Tasks</h3>
          {groupedPendingJobs.map((group) => {
            const isExpanded = expandedAreas.has(group.area.name)
            return (
              <div key={group.area.name} className="space-y-3">
                {/* Area Header - Clickable */}
                <div 
                  className="bg-gray-50 p-3 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleArea(group.area.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-gray-500 mt-0.5">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{group.area.name}</h4>
                        <p className="text-sm text-gray-600">{group.area.location.name}</p>
                        {group.area.duration_minutes && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⏱️ Guideline: ~{group.area.duration_minutes} minutes
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{group.jobs.length} tasks</Badge>
                  </div>
                </div>
                
                {/* Jobs in this area - Collapsible */}
                {isExpanded && group.jobs.map((job) => {
                const actualMinutes = job.start_time && job.completed_at 
                  ? Math.round((new Date(job.completed_at).getTime() - new Date(job.start_time).getTime()) / 60000)
                  : null
                const guideline = job.office_area.duration_minutes
                const withinGuideline = actualMinutes && guideline ? actualMinutes <= guideline : null

                return (
                  <Card key={job.id} className={`ml-4 ${job.start_time ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-orange-500'}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{job.job_template.title}</CardTitle>
                          {job.start_time && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Started at {new Date(job.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <Badge variant={job.start_time ? 'default' : 'secondary'}>
                          {job.start_time ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {job.job_template.description && (
                        <p className="text-sm text-muted-foreground">{job.job_template.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {job.job_template.frequency.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {job.start_time && job.start_photo_url && (
                          <Button 
                            onClick={() => {
                              setSelectedJob(job)
                              setShowPhotoModal(true)
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            📷 View Start Photo
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleCompleteClick(job)}
                          className="w-full"
                          size="sm"
                          variant={job.start_time ? 'default' : 'outline'}
                        >
                          {job.start_time ? '✓ Complete Job' : '▶ Start Job'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Completed Tasks</h3>
          {groupedCompletedJobs.map((group) => {
            const isExpanded = expandedAreas.has(group.area.name)
            return (
              <div key={group.area.name} className="space-y-3">
                {/* Area Header - Clickable */}
                <div 
                  className="bg-green-50 p-3 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => toggleArea(group.area.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-green-700 mt-0.5">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{group.area.name}</h4>
                        <p className="text-sm text-gray-600">{group.area.location.name}</p>
                        {group.area.duration_minutes && (
                          <p className="text-xs text-blue-600 mt-1">
                            ⏱️ Guideline: ~{group.area.duration_minutes} minutes
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">{group.jobs.length} done</Badge>
                  </div>
                </div>
                
                {/* Jobs in this area - Collapsible */}
                {isExpanded && group.jobs.map((job) => {
                const actualMinutes = job.start_time && job.completed_at 
                  ? Math.round((new Date(job.completed_at).getTime() - new Date(job.start_time).getTime()) / 60000)
                  : null
                const guideline = job.office_area.duration_minutes
                const withinGuideline = actualMinutes && guideline ? actualMinutes <= guideline : null

                return (
                  <Card key={job.id} className="border-l-4 border-l-green-500 opacity-75 ml-4">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{job.job_template.title}</CardTitle>
                        </div>
                        <Badge variant="default">Completed</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {job.job_template.description && (
                        <p className="text-sm text-muted-foreground">{job.job_template.description}</p>
                      )}
                      <div className="text-sm space-y-1">
                        {job.start_time && (
                          <p className="text-muted-foreground">
                            Started: <span className="font-medium text-foreground">
                              {new Date(job.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          Completed: <span className="font-medium text-foreground">
                            {new Date(job.completed_at!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        {actualMinutes !== null && (
                          <p className="text-muted-foreground">
                            Duration: <span className={`font-medium ${
                              withinGuideline === true ? 'text-green-600' : 
                              withinGuideline === false ? 'text-orange-600' : 'text-foreground'
                            }`}>
                              {actualMinutes} min
                            </span>
                            {guideline && (
                              <span className="text-xs ml-2">
                                {withinGuideline ? '✓ Within guideline' : `⚠️ ${actualMinutes - guideline} min over`}
                              </span>
                            )}
                          </p>
                        )}
                        {job.notes && (
                          <p className="text-muted-foreground mt-1">
                            Notes: <span className="text-foreground">{job.notes}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(job.start_photo_url || job.end_photo_url) && (
                          <Button 
                            onClick={() => {
                              setSelectedJob(job)
                              setShowPhotoModal(true)
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            📷 View Photos
                          </Button>
                        )}
                        <Button 
                          onClick={() => {
                            setSelectedJob(job)
                            setShowUndoModal(true)
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Undo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            )
          })}
        </div>
      )}

      {/* Camera Modal */}
      <Dialog open={showCameraModal} onOpenChange={(open) => {
        setShowCameraModal(open)
        if (!open) {
          setCapturedPhoto(null)
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
        }
      }}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {cameraAction === 'start' ? 'Take Start Photo' : 'Take End Photo'}
            </DialogTitle>
            <DialogDescription>
              Take a photo to document the job {cameraAction === 'start' ? 'start' : 'completion'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!capturedPhoto ? (
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img 
                  src={capturedPhoto} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex gap-3">
              {!capturedPhoto ? (
                <>
                  <Button 
                    onClick={capturePhoto} 
                    className="flex-1"
                  >
                    📷 Capture Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCameraModal(false)
                      setCapturedPhoto(null)
                      setSelectedJob(null)
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCameraSubmit} 
                    disabled={uploadingPhoto}
                    className="flex-1"
                  >
                    {uploadingPhoto ? 'Uploading...' : '✓ Use Photo'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    disabled={uploadingPhoto}
                    className="flex-1"
                  >
                    🔄 Retake
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Undo Options Modal */}
      <Dialog open={showUndoModal} onOpenChange={setShowUndoModal}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Undo Job Completion</DialogTitle>
            <DialogDescription>
              {selectedJob?.job_template.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose how to undo this completed job:
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => handleUncomplete('in-progress')}
                disabled={submitting}
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
              >
                <div className="text-left">
                  <div className="font-semibold">↩️ Back to In Progress</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Keep start time and start photo. Remove completion and end photo.
                  </div>
                </div>
              </Button>
              <Button 
                onClick={() => handleUncomplete('restart')}
                disabled={submitting}
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
              >
                <div className="text-left">
                  <div className="font-semibold">🔄 Restart Job</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Clear everything. Start fresh as if job was never started.
                  </div>
                </div>
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setShowUndoModal(false)
                setSelectedJob(null)
              }}
              disabled={submitting}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewing Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Photos</DialogTitle>
            <DialogDescription>
              {selectedJob?.job_template.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedJob?.start_photo_url && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Before (Start Photo)</h4>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <img 
                    src={selectedJob.start_photo_url} 
                    alt="Job start photo" 
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            )}
            {selectedJob?.end_photo_url && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">After (End Photo)</h4>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <img 
                    src={selectedJob.end_photo_url} 
                    alt="Job end photo" 
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            )}
            {!selectedJob?.start_photo_url && !selectedJob?.end_photo_url && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No photos available for this job
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowPhotoModal(false)
                setSelectedJob(null)
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Job Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>
              {selectedJob?.job_template.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this job..."
              />
              <p className="text-xs text-muted-foreground">
                Add any relevant details or observations
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleComplete} 
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Completing...' : 'Complete Job'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCompleteModal(false)
                  setSelectedJob(null)
                  setNotes('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
