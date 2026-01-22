'use client'

import { useEffect, useState } from 'react'
import { JobTemplate, WorkLocationWithAreas } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function JobTemplatesPage() {
  const [templates, setTemplates] = useState<(JobTemplate & { office_area: { name: string, location: { name: string } } })[]>([])
  const [locations, setLocations] = useState<WorkLocationWithAreas[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null)
  const [formData, setFormData] = useState({
    area_id: '',
    title: '',
    description: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    day_of_week: '',
    day_of_month: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [filters, setFilters] = useState({
    location_id: '',
    area_id: '',
    frequency: 'all',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [generateFormData, setGenerateFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location_id: 'all',
  })

  useEffect(() => {
    fetchLocations()
    fetchTemplates()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations')
      const result = await response.json()
      setLocations(result.data || [])
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/job-templates')
      const result = await response.json()
      setTemplates(result.data || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/job-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_id: formData.area_id,
          title: formData.title,
          description: formData.description || null,
          frequency: formData.frequency,
          day_of_week: formData.day_of_week ? parseInt(formData.day_of_week) : null,
          day_of_month: formData.day_of_month ? parseInt(formData.day_of_month) : null,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowModal(false)
        fetchTemplates()
        setFormData({
          area_id: '',
          title: '',
          description: '',
          frequency: 'daily',
          day_of_week: '',
          day_of_month: '',
        })
        setMessage({ type: 'success', text: 'Job template created successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error?.message || result.error || 'Failed to create job template' })
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      setMessage({ type: 'error', text: 'Network error. Please check your connection.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (template: JobTemplate & { office_area: any }) => {
    setSelectedTemplate(template)
    setFormData({
      area_id: template.area_id,
      title: template.title,
      description: template.description || '',
      frequency: template.frequency,
      day_of_week: template.day_of_week?.toString() || '',
      day_of_month: template.day_of_month?.toString() || '',
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) return

    setSubmitting(true)
    setMessage(null)
    
    try {
      const response = await fetch(`/api/admin/job-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          frequency: formData.frequency,
          day_of_week: formData.day_of_week ? parseInt(formData.day_of_week) : null,
          day_of_month: formData.day_of_month ? parseInt(formData.day_of_month) : null,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowEditModal(false)
        setSelectedTemplate(null)
        fetchTemplates()
        setFormData({
          area_id: '',
          title: '',
          description: '',
          frequency: 'daily',
          day_of_week: '',
          day_of_month: '',
        })
        setMessage({ type: 'success', text: 'Job template updated successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error?.message || result.error || 'Failed to update job template' })
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      setMessage({ type: 'error', text: 'Network error. Please check your connection.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/job-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      fetchTemplates()
    } catch (error) {
      console.error('Failed to toggle template:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job template?')) return

    try {
      await fetch(`/api/admin/job-templates/${id}`, {
        method: 'DELETE',
      })
      fetchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleGenerateChecklists = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/job-checklists/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: generateFormData.startDate,
          endDate: generateFormData.endDate,
          location_id: generateFormData.location_id,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowGenerateModal(false)
        const dateRange = generateFormData.startDate === generateFormData.endDate
          ? generateFormData.startDate
          : `${generateFormData.startDate} to ${generateFormData.endDate}`
        const locationName = generateFormData.location_id === 'all' 
          ? 'all locations'
          : locations.find(l => l.id === generateFormData.location_id)?.name || 'selected location'
        setMessage({ 
          type: 'success', 
          text: `Generated ${result.totalCreated} new checklist(s) for ${locationName} (${dateRange})! (${result.skipped} already existed)` 
        })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: 'error', text: result.error?.message || result.error || 'Failed to generate checklists' })
      }
    } catch (error) {
      console.error('Failed to generate checklists:', error)
      setMessage({ type: 'error', text: 'Network error. Please check your connection.' })
    } finally {
      setSubmitting(false)
    }
  }

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      monthly: 'bg-purple-100 text-purple-800',
    }
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (filters.location_id && template.office_area?.location?.name) {
      const location = locations.find(l => l.id === filters.location_id)
      if (location && template.office_area.location.name !== location.name) return false
    }
    if (filters.area_id && template.area_id !== filters.area_id) return false
    if (filters.frequency !== 'all' && template.frequency !== filters.frequency) return false
    return true
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredTemplates.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Get areas for selected location
  const availableAreas = filters.location_id
    ? locations.find(l => l.id === filters.location_id)?.office_areas || []
    : locations.flatMap(l => l.office_areas || [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading job templates...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Templates</h1>
          <p className="text-muted-foreground mt-1">Manage daily, weekly, and monthly job checklists</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setShowGenerateModal(true)} 
            variant="outline"
            disabled={submitting}
            className="flex-1 sm:flex-initial"
          >
            Generate Jobs
          </Button>
          <Button 
            onClick={() => setShowModal(true)} 
            className="flex-1 sm:flex-initial"
          >
            + Add Template
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-location">Location</Label>
              <select
                id="filter-location"
                value={filters.location_id}
                onChange={(e) => setFilters({ ...filters, location_id: e.target.value, area_id: '' })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-area">Area</Label>
              <select
                id="filter-area"
                value={filters.area_id}
                onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}
                className="w-full p-2 border rounded-md"
                disabled={!filters.location_id && availableAreas.length === 0}
              >
                <option value="">All Areas</option>
                {availableAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-frequency">Frequency</Label>
              <select
                id="filter-frequency"
                value={filters.frequency}
                onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredTemplates.length} of {templates.length} templates
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {templates.length === 0 ? 'No job templates configured yet' : 'No templates match the current filters'}
            </CardContent>
          </Card>
        ) : (
          paginatedTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.office_area?.location?.name} → {template.office_area?.name}
                    </CardDescription>
                  </div>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getFrequencyBadge(template.frequency)}`}>
                    {template.frequency.toUpperCase()}
                  </span>
                  {template.frequency === 'weekly' && template.day_of_week !== null && (
                    <span className="text-sm text-muted-foreground">
                      Every {getDayName(template.day_of_week)}
                    </span>
                  )}
                  {template.frequency === 'monthly' && template.day_of_month !== null && (
                    <span className="text-sm text-muted-foreground">
                      Day {template.day_of_month} of month
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleToggle(template.id, template.is_active)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => handleDelete(template.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {/* Mobile Pagination */}
        {filteredTemplates.length > 0 && totalPages > 1 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredTemplates.length)} of {filteredTemplates.length}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Location / Area</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  {templates.length === 0 ? 'No job templates configured yet' : 'No templates match the current filters'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.title}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{template.office_area?.location?.name}</div>
                      <div className="text-muted-foreground">{template.office_area?.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getFrequencyBadge(template.frequency)}`}>
                      {template.frequency.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {template.frequency === 'daily' && <span className="text-sm">Every day</span>}
                    {template.frequency === 'weekly' && template.day_of_week !== null && (
                      <span className="text-sm">Every {getDayName(template.day_of_week)}</span>
                    )}
                    {template.frequency === 'monthly' && template.day_of_month !== null && (
                      <span className="text-sm">Day {template.day_of_month}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(template)}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleToggle(template.id, template.is_active)}
                        variant="ghost"
                        size="sm"
                      >
                        {template.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        onClick={() => handleDelete(template.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Desktop Pagination */}
      {filteredTemplates.length > 0 && totalPages > 1 && (
        <Card className="hidden lg:block mt-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTemplates.length)} of {filteredTemplates.length} results
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="border rounded px-3 py-1.5 text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Template Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Job Template</DialogTitle>
            <DialogDescription>
              Create a new recurring job for an office area
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area">Office Area *</Label>
              <select
                id="area"
                value={formData.area_id}
                onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select an area...</option>
                {locations.map((location) =>
                  location.office_areas?.map((area) => (
                    <option key={area.id} value={area.id}>
                      {location.name} → {area.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Clean reception desk"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details about the job"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <select
                id="frequency"
                value={formData.frequency}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    day_of_week: '',
                    day_of_month: '',
                  })
                }}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {formData.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor="day_of_week">Day of Week *</Label>
                <select
                  id="day_of_week"
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select a day...</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
            )}

            {formData.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="day_of_month">Day of Month *</Label>
                <Input
                  id="day_of_month"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                  placeholder="1-31"
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Creating...' : 'Create Template'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Jobs Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Job Checklists</DialogTitle>
            <DialogDescription>
              Create job checklists for active templates. Existing checklists for selected dates will be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gen-location">Location</Label>
              <select
                id="gen-location"
                value={generateFormData.location_id}
                onChange={(e) => setGenerateFormData({ ...generateFormData, location_id: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-start-date">Start Date</Label>
              <Input
                id="gen-start-date"
                type="date"
                value={generateFormData.startDate}
                onChange={(e) => setGenerateFormData({ ...generateFormData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-end-date">End Date</Label>
              <Input
                id="gen-end-date"
                type="date"
                value={generateFormData.endDate}
                onChange={(e) => setGenerateFormData({ ...generateFormData, endDate: e.target.value })}
                min={generateFormData.startDate}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">📋 Generation Info:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Only active templates will be processed</li>
                <li>Existing checklists will be automatically skipped</li>
                <li>Weekly jobs match the day of week</li>
                <li>Monthly jobs match the day of month</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleGenerateChecklists} 
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Generating...' : 'Generate Checklists'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGenerateModal(false)}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Job Template</DialogTitle>
            <DialogDescription>
              Update job template details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Job Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Clean reception desk"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details about the job"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-frequency">Frequency *</Label>
              <select
                id="edit-frequency"
                value={formData.frequency}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    day_of_week: '',
                    day_of_month: '',
                  })
                }}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {formData.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor="edit-day_of_week">Day of Week *</Label>
                <select
                  id="edit-day_of_week"
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select a day...</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
            )}

            {formData.frequency === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="edit-day_of_month">Day of Month *</Label>
                <Input
                  id="edit-day_of_month"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                  placeholder="1-31"
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Updating...' : 'Update Template'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedTemplate(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
