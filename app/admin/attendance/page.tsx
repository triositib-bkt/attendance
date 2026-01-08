'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { AttendanceWithProfile } from '@/lib/types'
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
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchAttendance()
  }, [dateFilter])

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

  const calculateHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return { text: 'In Progress', isInProgress: true }
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return { text: `${hours}h ${minutes}m`, isInProgress: false }
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentRecords = records.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(records.length / itemsPerPage)

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance Records</h1>
          <p className="text-muted-foreground mt-1">View and manage daily attendance</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="date-filter" className="text-sm font-medium">
            Date:
          </Label>
          <Input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Present</div>
            <div className="text-2xl font-bold mt-1">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Currently Working</div>
            <div className="text-2xl font-bold mt-1">
              {records.filter(r => !r.check_out).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold mt-1">
              {records.filter(r => r.check_out).length}
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
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, records.length)} of {records.length} records
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
