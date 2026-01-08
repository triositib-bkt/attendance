'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Attendance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AttendanceHistory() {
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    fetchHistory()
  }, [selectedMonth])

  const fetchHistory = async () => {
    const startDate = startOfMonth(new Date(selectedMonth + '-01'))
    const endDate = endOfMonth(new Date(selectedMonth + '-01'))
    
    const response = await fetch(
      `/api/attendance/history?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    )
    const result = await response.json()
    
    if (result.data) {
      setRecords(result.data)
    }
    setLoading(false)
  }

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'In Progress'
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'present') return 'default'
    if (status === 'late') return 'outline'
    return 'destructive'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop View - Table */}
      <Card className="hidden md:block">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Attendance History</CardTitle>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-auto"
          />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      No attendance records found for this month
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>{format(new Date(record.check_in), 'MMM dd, yyyy')}</div>
                        {((record as any).check_in_location_valid === false || (record as any).check_out_location_valid === false) && (
                          <Badge variant="outline" className="mt-1 text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                            ⚠️ Location Issue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.check_in), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {record.check_out ? format(new Date(record.check_out), 'HH:mm:ss') : '-'}
                      </TableCell>
                      <TableCell>
                        {calculateDuration(record.check_in, record.check_out)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(record as any).check_in_location_valid === false && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 mb-1 block w-fit">
                            ⚠️ Check-in
                          </Badge>
                        )}
                        {(record as any).check_out_location_valid === false && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 block w-fit">
                            ⚠️ Check-out
                          </Badge>
                        )}
                        {(record as any).check_in_location_valid !== false && (record as any).check_out_location_valid !== false && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            ✓ Valid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile View - Card List */}
      <div className="md:hidden">
        {/* Sticky Month Filter */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mx-4 px-4 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-3">
          {records.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                No attendance records found for this month
              </CardContent>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.id} className="border-2 hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-semibold text-sm">
                        {format(new Date(record.check_in), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <Badge variant={getStatusVariant(record.status)}>
                      {record.status}
                    </Badge>
                  </div>

                  {/* Time Info */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                      <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-0.5">Check In</div>
                        <div className="font-semibold text-sm">
                          {format(new Date(record.check_in), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                      <svg className="w-4 h-4 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-0.5">Check Out</div>
                        <div className="font-semibold text-sm">
                          {record.check_out ? format(new Date(record.check_out), 'HH:mm:ss') : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 mb-3">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">Duration: </span>
                      <span className="font-semibold text-sm">{calculateDuration(record.check_in, record.check_out)}</span>
                    </div>
                  </div>

                  {/* Location Validation */}
                  <div className="flex flex-wrap gap-2">
                    {(record as any).check_in_location_valid === false && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                        ⚠️ Check-in Location
                      </Badge>
                    )}
                    {(record as any).check_out_location_valid === false && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                        ⚠️ Check-out Location
                      </Badge>
                    )}
                    {(record as any).check_in_location_valid !== false && (record as any).check_out_location_valid !== false && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        ✓ Valid Location
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  )
}
