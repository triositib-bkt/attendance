'use client'

import { useEffect, useState } from 'react'
import { Profile, EmployeeSchedule, WorkLocation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface ScheduleWithProfile extends EmployeeSchedule {
  profiles: {
    id: string
    full_name: string
    employee_id: string
    department: string | null
  }
  work_locations?: {
    id: string
    name: string
  } | null
  location_name?: string | null
  employee_name?: string
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleWithProfile[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [locations, setLocations] = useState<WorkLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithProfile | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString())
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Form states
  const [formData, setFormData] = useState({
    user_id: '',
    schedule_date: '',
    shift_start: '09:00',
    shift_end: '17:00',
    location_id: ''
  })

  // Edit form states
  const [editFormData, setEditFormData] = useState({
    shift_start: '',
    shift_end: '',
    location_id: '',
    schedule_date: ''
  })

  // Generate form states
  const [generateFormData, setGenerateFormData] = useState({
    user_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    shift_start: '09:00',
    shift_end: '17:00',
    location_id: '',
    overwrite: false
  })

  const [generateMessage, setGenerateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchEmployees()
    fetchLocations()
    fetchSchedules()
  }, [selectedEmployee, selectedLocation, selectedYear, selectedMonth])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees')
      const result = await response.json()
      setEmployees(result.data || [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations')
      const result = await response.json()
      setLocations(result.data || [])
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const fetchSchedules = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedEmployee) params.append('userId', selectedEmployee)
      if (selectedLocation) params.append('location_id', selectedLocation)
      if (selectedYear) params.append('year', selectedYear)
      if (selectedMonth) params.append('month', selectedMonth)
      
      const url = `/api/admin/schedules?${params.toString()}`
      console.log('[Frontend] Fetching schedules from:', url)
      console.log('[Frontend] Filters - Year:', selectedYear, 'Month:', selectedMonth, 'Employee:', selectedEmployee, 'Location:', selectedLocation)
      const response = await fetch(url)
      const result = await response.json()
      console.log('[Frontend] Schedules result:', result)
      console.log('[Frontend] Number of schedules:', result.data?.length || 0)
      setSchedules(result.data || [])
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSchedule = async () => {
    if (!formData.user_id || !formData.schedule_date || !formData.shift_start || !formData.shift_end) {
      alert('Please fill in all required fields')
      return
    }

    // Calculate day of week from selected date (0=Sunday, 1=Monday, etc.)
    const selectedDate = new Date(formData.schedule_date + 'T00:00:00')
    const dayOfWeek = selectedDate.getDay()

    setIsSubmitting(true)
    try {
      const payload = {
        user_id: formData.user_id,
        day_of_week: dayOfWeek,
        shift_start: formData.shift_start,
        shift_end: formData.shift_end,
        location_id: formData.location_id || null,
        effective_date: formData.schedule_date,
        end_date: formData.schedule_date // Same day
      }
      
      console.log('Submitting schedule:', payload)
      
      const response = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log('Schedule saved successfully:', result)
        setShowAddDialog(false)
        setFormData({
          user_id: '',
          schedule_date: '',
          shift_start: '09:00',
          shift_end: '17:00',
          location_id: ''
        })
        fetchSchedules()
      } else {
        console.error('Error saving schedule:', result)
        alert(result.error || 'Failed to add schedule')
      }
    } catch (error) {
      console.error('Failed to add schedule:', error)
      alert('Failed to add schedule: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      const response = await fetch(`/api/admin/schedules/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchSchedules()
      } else {
        alert('Failed to delete schedule')
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      alert('Failed to delete schedule')
    }
  }

  const handleEditSchedule = (schedule: ScheduleWithProfile) => {
    setEditingSchedule(schedule)
    setEditFormData({
      shift_start: schedule.shift_start.slice(0, 5),
      shift_end: schedule.shift_end.slice(0, 5),
      location_id: schedule.location_id || '',
      schedule_date: schedule.effective_date || ''
    })
    setShowEditDialog(true)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !editFormData.shift_start || !editFormData.shift_end) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: any = {
        shift_start: editFormData.shift_start,
        shift_end: editFormData.shift_end,
        location_id: editFormData.location_id || null
      }

      // If schedule date is changed, update effective_date and end_date
      if (editFormData.schedule_date && editFormData.schedule_date !== editingSchedule.effective_date) {
        const selectedDate = new Date(editFormData.schedule_date + 'T00:00:00')
        const dayOfWeek = selectedDate.getDay()
        
        payload.effective_date = editFormData.schedule_date
        payload.end_date = editFormData.schedule_date
        payload.day_of_week = dayOfWeek
      }

      const response = await fetch(`/api/admin/schedules/${editingSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setShowEditDialog(false)
        setEditingSchedule(null)
        fetchSchedules()
      } else {
        alert(result.error || 'Failed to update schedule')
      }
    } catch (error) {
      console.error('Failed to update schedule:', error)
      alert('Failed to update schedule')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkGenerate = async () => {
    if (!generateFormData.user_id || !generateFormData.start_date || !generateFormData.end_date || !generateFormData.location_id) {
      alert('Please fill in all required fields')
      return
    }

    if (new Date(generateFormData.start_date) > new Date(generateFormData.end_date)) {
      alert('Start date must be before or equal to end date')
      return
    }

    setIsSubmitting(true)
    setGenerateMessage(null)
    
    console.log('Sending bulk generation request:', generateFormData)
    
    try {
      const response = await fetch('/api/admin/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateFormData)
      })

      const result = await response.json()
      
      console.log('Bulk generation response:', result)
      
      if (response.ok) {
        setGenerateMessage({ 
          type: 'success', 
          text: `Generated ${result.created} schedule(s). Skipped ${result.skipped} existing schedule(s).` 
        })
        setTimeout(() => {
          setShowGenerateDialog(false)
          setGenerateMessage(null)
          fetchSchedules()
        }, 2000)
      } else {
        setGenerateMessage({ type: 'error', text: result.error || 'Failed to generate schedules' })
      }
    } catch (error) {
      console.error('Failed to generate schedules:', error)
      setGenerateMessage({ type: 'error', text: 'Failed to generate schedules: ' + (error as Error).message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintSchedule = (userId: string, employeeName: string) => {
    const employeeSchedules = schedules.filter(s => s.user_id === userId)
    if (employeeSchedules.length === 0) {
      alert('No schedules to print')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${employeeName} - Schedule</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 10px; }
          h2 { font-size: 18px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f4f4f4; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Employee Schedule</h1>
        <h2>${employeeName} - ${monthName}</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Shift Start</th>
              <th>Shift End</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${employeeSchedules.sort((a, b) => {
              const dateA = a.effective_date ? new Date(a.effective_date).getTime() : 0
              const dateB = b.effective_date ? new Date(b.effective_date).getTime() : 0
              return dateA - dateB
            }).map(schedule => `
              <tr>
                <td>${schedule.effective_date ? new Date(schedule.effective_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                <td>${schedule.effective_date ? new Date(schedule.effective_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : DAYS[schedule.day_of_week]}</td>
                <td>${schedule.shift_start.slice(0, 5)}</td>
                <td>${schedule.shift_end.slice(0, 5)}</td>
                <td>${schedule.work_locations?.name || schedule.location_name || 'All locations'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Sort schedules by date
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateA = a.effective_date ? new Date(a.effective_date).getTime() : 0
    const dateB = b.effective_date ? new Date(b.effective_date).getTime() : 0
    
    if (sortOrder === 'asc') {
      return dateA - dateB
    } else {
      return dateB - dateA
    }
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentSchedules = sortedSchedules.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(sortedSchedules.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading schedules...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Employee Schedules</h1>
            <p className="text-muted-foreground mt-1">Manage work schedules by day</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                setCurrentPage(1)
              }}
            >
              Sort: {sortOrder === 'asc' ? '📅 Oldest First' : '📅 Newest First'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (selectedEmployee) {
                  const employee = employees.find(e => e.id === selectedEmployee)
                  if (employee) {
                    handlePrintSchedule(selectedEmployee, employee.full_name)
                  }
                } else {
                  alert('Please select an employee to print schedules')
                }
              }}
              disabled={!selectedEmployee}
            >
              🖨️ Print
            </Button>
            <Button variant="outline" onClick={() => setShowGenerateDialog(true)}>
              📅 Generate Bulk
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              Add Schedule
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Label htmlFor="employee-filter" className="text-sm font-medium whitespace-nowrap">
            Filters:
          </Label>
          <select
            id="employee-filter"
            value={selectedEmployee}
            onChange={(e) => {
              setSelectedEmployee(e.target.value)
              setCurrentPage(1)
            }}
            className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} {employee.employee_id ? `(${employee.employee_id})` : ''}
              </option>
            ))}
          </select>

          <select
            id="location-filter"
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value)
              setCurrentPage(1)
            }}
            className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

          <select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value)
              setCurrentPage(1)
            }}
            className="flex h-10 w-full sm:w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {[2024, 2025, 2026, 2027, 2028].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            id="month-filter"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value)
              setCurrentPage(1)
            }}
            className="flex h-10 w-full sm:w-36 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {currentSchedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No schedules found
            </CardContent>
          </Card>
        ) : (
          currentSchedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{schedule.profiles.full_name}</CardTitle>
                    <CardDescription>
                      {schedule.profiles.employee_id && `ID: ${schedule.profiles.employee_id} • `}
                      {schedule.profiles.department || 'No department'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintSchedule(schedule.user_id, schedule.profiles.full_name)}
                  >
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {schedule.effective_date 
                            ? new Date(schedule.effective_date + 'T00:00:00').toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : DAYS[schedule.day_of_week]
                          }
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {schedule.shift_start.slice(0, 5)} - {schedule.shift_end.slice(0, 5)}
                        </div>
                        {(schedule.work_locations?.name || schedule.location_name) && (
                          <div className="text-xs text-primary mt-1">
                            📍 {schedule.work_locations?.name || schedule.location_name}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSchedule(schedule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  setCurrentPage(1)
                }}
              >
                <div className="flex items-center gap-1">
                  Schedule Date
                  <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                </div>
              </TableHead>
              <TableHead>Shift Start</TableHead>
              <TableHead>Shift End</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                  No schedules found
                </TableCell>
              </TableRow>
            ) : (
              currentSchedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.profiles.full_name}</TableCell>
                  <TableCell>{schedule.profiles.employee_id || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{schedule.profiles.department || '-'}</TableCell>
                  <TableCell>
                    {schedule.effective_date ? (
                      new Date(schedule.effective_date + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    ) : (
                      DAYS[schedule.day_of_week]
                    )}
                  </TableCell>
                  <TableCell>{schedule.shift_start.slice(0, 5)}</TableCell>
                  <TableCell>{schedule.shift_end.slice(0, 5)}</TableCell>
                  <TableCell>{schedule.work_locations?.name || schedule.location_name || 'All locations'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintSchedule(schedule.user_id, schedule.profiles.full_name)}
                        className="h-7 text-xs"
                      >
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSchedule(schedule)}
                        className="h-7 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedSchedules.length)} of {sortedSchedules.length} schedules
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {(() => {
                const maxButtons = 4
                let startPage = Math.max(1, currentPage - 1)
                let endPage = Math.min(totalPages, startPage + maxButtons - 1)
                
                if (endPage - startPage < maxButtons - 1) {
                  startPage = Math.max(1, endPage - maxButtons + 1)
                }
                
                return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-9"
                  >
                    {page}
                  </Button>
                ))
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Schedule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee Schedule</DialogTitle>
            <DialogDescription>
              Set work schedule for an employee on a specific day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <select
                id="employee"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select Employee</option>
                {employees.filter(e => e.is_active).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} {employee.employee_id ? `(${employee.employee_id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-date">Schedule Date</Label>
              <Input
                id="schedule-date"
                type="date"
                value={formData.schedule_date}
                onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Day of week will be calculated automatically</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-start">Shift Start</Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={formData.shift_start}
                  onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift-end">Shift End</Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={formData.shift_end}
                  onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <select
                id="location"
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Locations</option>
                {locations.filter(l => l.is_active).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSchedule} 
              disabled={!formData.user_id || !formData.schedule_date || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Add Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Schedules Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Bulk Schedules</DialogTitle>
            <DialogDescription>
              Create schedules for an employee across a date range. Existing schedules will be skipped.
            </DialogDescription>
          </DialogHeader>

          {generateMessage && (
            <div className={`p-3 rounded-md text-sm ${generateMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {generateMessage.text}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gen-employee">Employee *</Label>
              <select
                id="gen-employee"
                value={generateFormData.user_id}
                onChange={(e) => setGenerateFormData({ ...generateFormData, user_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select Employee</option>
                {employees.filter(e => e.is_active).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} {employee.employee_id ? `(${employee.employee_id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gen-location">Location *</Label>
              <select
                id="gen-location"
                value={generateFormData.location_id}
                onChange={(e) => setGenerateFormData({ ...generateFormData, location_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select Location</option>
                {locations.filter(l => l.is_active).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gen-start-date">Start Date *</Label>
                <Input
                  id="gen-start-date"
                  type="date"
                  value={generateFormData.start_date}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gen-end-date">End Date *</Label>
                <Input
                  id="gen-end-date"
                  type="date"
                  value={generateFormData.end_date}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, end_date: e.target.value })}
                  min={generateFormData.start_date}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gen-shift-start">Shift Start *</Label>
                <Input
                  id="gen-shift-start"
                  type="time"
                  value={generateFormData.shift_start}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, shift_start: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gen-shift-end">Shift End *</Label>
                <Input
                  id="gen-shift-end"
                  type="time"
                  value={generateFormData.shift_end}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, shift_end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-md">
              <input
                type="checkbox"
                id="gen-overwrite"
                checked={generateFormData.overwrite}
                onChange={(e) => setGenerateFormData({ ...generateFormData, overwrite: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
              />
              <Label htmlFor="gen-overwrite" className="text-sm font-normal cursor-pointer">
                Overwrite existing schedules (deactivate old schedules and create new ones)
              </Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">📋 Info:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>This creates date-specific schedules for each day in the selected range</li>
                <li>Each date gets its own schedule entry (e.g., Jan 1, Jan 2, Jan 3, etc.)</li>
                <li>Generating for a full month will create up to 30-31 schedules</li>
                <li>If a specific date already has a schedule, it will be skipped</li>
                <li>Check "Overwrite" to replace existing schedules for the same dates</li>
                <li>Day of week will be calculated automatically for each date</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowGenerateDialog(false)
                setGenerateMessage(null)
              }} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkGenerate} 
              disabled={!generateFormData.user_id || !generateFormData.location_id || isSubmitting}
            >
              {isSubmitting ? 'Generating...' : 'Generate Schedules'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update work schedule for {editingSchedule?.profiles.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{editingSchedule?.profiles.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {editingSchedule?.profiles.employee_id && `ID: ${editingSchedule.profiles.employee_id}`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-schedule-date">Schedule Date</Label>
              <Input
                id="edit-schedule-date"
                type="date"
                value={editFormData.schedule_date}
                onChange={(e) => setEditFormData({ ...editFormData, schedule_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Current: {editingSchedule?.effective_date 
                  ? new Date(editingSchedule.effective_date + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : DAYS[editingSchedule?.day_of_week || 0]
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shift-start">Shift Start</Label>
                <Input
                  id="edit-shift-start"
                  type="time"
                  value={editFormData.shift_start}
                  onChange={(e) => setEditFormData({ ...editFormData, shift_start: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-shift-end">Shift End</Label>
                <Input
                  id="edit-shift-end"
                  type="time"
                  value={editFormData.shift_end}
                  onChange={(e) => setEditFormData({ ...editFormData, shift_end: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Location (Optional)</Label>
              <select
                id="edit-location"
                value={editFormData.location_id}
                onChange={(e) => setEditFormData({ ...editFormData, location_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Locations</option>
                {locations.filter(l => l.is_active).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Current: {editingSchedule?.work_locations?.name || editingSchedule?.location_name || 'All locations'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false)
                setEditingSchedule(null)
              }} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSchedule} 
              disabled={!editFormData.shift_start || !editFormData.shift_end || isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
