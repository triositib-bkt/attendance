'use client'

import { useEffect, useState } from 'react'
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
  const [selectedJob, setSelectedJob] = useState<JobChecklistItem | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())

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
    // If not started yet, start it first
    if (!job.start_time) {
      handleStartJob(job.id)
      return
    }
    setSelectedJob(job)
    setNotes('')
    setShowCompleteModal(true)
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
        body: JSON.stringify({ notes: notes || null }),
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

  const handleUncomplete = async (jobId: string) => {
    if (!confirm('Mark this job as incomplete?')) return

    try {
      const response = await fetch(`/api/job-checklists/${jobId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        fetchJobs()
        setMessage({ type: 'success', text: 'Job marked as incomplete' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to uncomplete job' })
      }
    } catch (error) {
      console.error('Failed to uncomplete job:', error)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
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
                      <Button 
                        onClick={() => handleCompleteClick(job)}
                        className="w-full"
                        size="sm"
                        variant={job.start_time ? 'default' : 'outline'}
                      >
                        {job.start_time ? '✓ Complete Job' : '▶ Start Job'}
                      </Button>
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
                      <Button 
                        onClick={() => handleUncomplete(job.id)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Undo
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            )
          })}
        </div>
      )}

      {/* Complete Job Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
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
