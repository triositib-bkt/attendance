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
    <Card>
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
  )
}
