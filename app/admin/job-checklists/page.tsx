'use client'

import { useEffect, useState } from 'react'
import { JobChecklistWithDetails, WorkLocation } from '@/lib/types'
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

export default function JobChecklistsAdminPage() {
  const [checklists, setChecklists] = useState<any[]>([])
  const [locations, setLocations] = useState<WorkLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, completionRate: 0 })
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    status: 'all',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchLocations()
  }, [])

  useEffect(() => {
    fetchChecklists()
    setCurrentPage(1) // Reset to first page when filters change
  }, [filters])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations')
      const result = await response.json()
      setLocations(result.data || [])
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const fetchChecklists = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('date', filters.date)
      if (filters.location_id) params.append('location_id', filters.location_id)
      if (filters.status !== 'all') params.append('status', filters.status)

      const response = await fetch(`/api/admin/job-checklists?${params.toString()}`)
      const result = await response.json()
      setChecklists(result.data || [])
      setStats(result.stats || { total: 0, completed: 0, pending: 0, completionRate: 0 })
    } catch (error) {
      console.error('Failed to fetch checklists:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Pagination logic
  const totalPages = Math.ceil(checklists.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedChecklists = checklists.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (loading && checklists.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading checklists...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Job Checklists</h1>
        <p className="text-muted-foreground mt-1">Monitor daily job completion across all locations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.completionRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={filters.location_id}
                onChange={(e) => setFilters({ ...filters, location_id: e.target.value })}
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
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {checklists.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No job checklists for this date
            </CardContent>
          </Card>
        ) : (
          paginatedChecklists.map((checklist) => (
            <Card key={checklist.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{checklist.job_template?.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {checklist.office_area?.location?.name} → {checklist.office_area?.name}
                    </CardDescription>
                  </div>
                  <Badge variant={checklist.completed_at ? 'default' : 'secondary'}>
                    {checklist.completed_at ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {checklist.job_template?.description && (
                  <p className="text-sm text-muted-foreground">{checklist.job_template.description}</p>
                )}
                {checklist.completed_at && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Completed by: <span className="font-medium text-foreground">{checklist.completed_by_profile?.full_name}</span>
                    </p>
                    <p className="text-muted-foreground">
                      At: {formatDate(checklist.completed_at)}
                    </p>
                    {checklist.notes && (
                      <p className="mt-1 text-muted-foreground">
                        Notes: <span className="text-foreground">{checklist.notes}</span>
                      </p>
                    )}
                  </div>
                )}
                {/* Photos */}
                {(checklist.start_photo_url || checklist.end_photo_url) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      {checklist.start_photo_url && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Before</p>
                          <a 
                            href={checklist.start_photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={checklist.start_photo_url}
                              alt="Before photo"
                              className="w-full h-24 object-cover rounded-md border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        </div>
                      )}
                      {checklist.end_photo_url && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">After</p>
                          <a 
                            href={checklist.end_photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={checklist.end_photo_url}
                              alt="After photo"
                              className="w-full h-24 object-cover rounded-md border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        {/* Mobile Pagination */}
        {checklists.length > 0 && totalPages > 1 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, checklists.length)} of {checklists.length}
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
              <TableHead>Status</TableHead>
              <TableHead>Completed By</TableHead>
              <TableHead>Completed At</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checklists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                  No job checklists for this date
                </TableCell>
              </TableRow>
            ) : (
              paginatedChecklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{checklist.job_template?.title}</div>
                      {checklist.job_template?.description && (
                        <div className="text-sm text-muted-foreground">{checklist.job_template.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{checklist.office_area?.location?.name}</div>
                      <div className="text-muted-foreground">{checklist.office_area?.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{checklist.job_template?.frequency}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={checklist.completed_at ? 'default' : 'secondary'}>
                      {checklist.completed_at ? 'Completed' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {checklist.completed_by_profile?.full_name || '-'}
                  </TableCell>
                  <TableCell>
                    {checklist.completed_at ? formatDate(checklist.completed_at) : '-'}
                  </TableCell>
                  <TableCell>
                    {(checklist.start_photo_url || checklist.end_photo_url) ? (
                      <div className="flex gap-2">
                        {checklist.start_photo_url && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Before</p>
                            <a 
                              href={checklist.start_photo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={checklist.start_photo_url}
                                alt="Before"
                                className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          </div>
                        )}
                        {checklist.end_photo_url && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">After</p>
                            <a 
                              href={checklist.end_photo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={checklist.end_photo_url}
                                alt="After"
                                className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm">
                      {checklist.notes || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Desktop Pagination */}
      {checklists.length > 0 && totalPages > 1 && (
        <Card className="hidden lg:block mt-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, checklists.length)} of {checklists.length} results
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
    </div>
  )
}
