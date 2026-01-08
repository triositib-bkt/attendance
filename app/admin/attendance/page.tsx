'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { AttendanceWithProfile, Profile } from '@/lib/types'
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

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceWithProfile[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [recomputeLoading, setRecomputeLoading] = useState(false)
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchAttendance()
    setCurrentPage(1) // Reset to first page when filter changes
  }, [dateFilter, employeeFilter])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees')
      const result = await response.json()
      setEmployees(result.data || [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/admin/attendance?date=${dateFilter}`)
      const result = await response.json()
      setRecords(result.data || [])
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecompute = async () => {
    if (!confirm('This will recalculate attendance status based on current schedules. Continue?')) {
      return
    }

    setRecomputeLoading(true)
    setRecomputeMessage(null)

    try {
      const response = await fetch('/api/admin/attendance/recompute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateFilter,
          userId: employeeFilter === 'all' ? null : employeeFilter
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setRecomputeMessage(`✓ ${result.message}`)
        // Refresh the attendance list
        await fetchAttendance()
      } else {
        setRecomputeMessage(`✗ Error: ${result.error || 'Failed to recompute'}`)
      }
    } catch (error) {
      console.error('Recompute failed:', error)
      setRecomputeMessage('✗ Error: Failed to recompute attendance')
    } finally {
      setRecomputeLoading(false)
      // Clear message after 5 seconds
      setTimeout(() => setRecomputeMessage(null), 5000)
    }
  }

  const calculateHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return { text: 'In Progress', isInProgress: true }
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return { text: `${hours}h ${minutes}m`, isInProgress: false }
  }

  // Filter records by employee
  const filteredRecords = employeeFilter === 'all' 
    ? records 
    : records.filter(record => record.user_id === employeeFilter)

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentRecords = filteredRecords.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading attendance records...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance Records</h1>
          <p className="text-muted-foreground mt-1">View and manage daily attendance</p>
        </div>
        
        {/* Recompute Message */}
        {recomputeMessage && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            recomputeMessage.startsWith('✓') 
              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
          }`}>
            {recomputeMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Label htmlFor="date-filter" className="text-sm font-medium whitespace-nowrap">
              Date:
            </Label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Label htmlFor="employee-filter" className="text-sm font-medium whitespace-nowrap">
              Employee:
            </Label>
            <select
              id="employee-filter"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} {employee.employee_id ? `(${employee.employee_id})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Button 
            onClick={handleRecompute} 
            disabled={recomputeLoading || filteredRecords.length === 0}
            variant="outline"
            className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {recomputeLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Recomputing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recompute Status
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Present</div>
            <div className="text-2xl font-bold mt-1">{filteredRecords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Currently Working</div>
            <div className="text-2xl font-bold mt-1">
              {filteredRecords.filter(r => !r.check_out).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold mt-1">
              {filteredRecords.filter(r => r.check_out).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {currentRecords.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No attendance records found for this date
            </CardContent>
          </Card>
        ) : (
          currentRecords.map((record) => {
            const hours = calculateHours(record.check_in, record.check_out)
            return (
              <Card key={record.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{record.profiles.full_name}</CardTitle>
                      <CardDescription>{record.profiles.employee_id || 'N/A'}</CardDescription>
                    </div>
                    <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'outline' : 'destructive'}>
                      {record.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{record.profiles.department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hours</p>
                      <p className={`font-medium ${hours.isInProgress ? 'text-primary' : ''}`}>
                        {hours.text}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check In</p>
                      <p className="font-medium">{format(new Date(record.check_in), 'HH:mm:ss')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check Out</p>
                      <p className="font-medium">
                        {record.check_out ? format(new Date(record.check_out), 'HH:mm:ss') : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No attendance records found for this date
                </TableCell>
              </TableRow>
            ) : (
              currentRecords.map((record) => {
                const hours = calculateHours(record.check_in, record.check_out)
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.profiles.employee_id || '-'}
                    </TableCell>
                    <TableCell>{record.profiles.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.profiles.department || '-'}
                    </TableCell>
                    <TableCell>{format(new Date(record.check_in), 'HH:mm:ss')}</TableCell>
                    <TableCell>
                      {record.check_out ? format(new Date(record.check_out), 'HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={hours.isInProgress ? 'text-primary font-medium' : ''}>
                        {hours.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'outline' : 'destructive'}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRecords.length)} of {filteredRecords.length} records
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              ))}
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
    </div>
  )
}
