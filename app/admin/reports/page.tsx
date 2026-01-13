'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

type ReportTab = 'attendance' | 'checklist'

interface EmployeeStats {
  id: string
  full_name: string
  employee_id: string
  department: string | null
  days_present: number
  total_hours: number
  avg_hours: number
}

interface ReportData {
  totalEmployees: number
  avgAttendance: number
  totalHours: number
  employees: EmployeeStats[]
}

interface ChecklistCompletion {
  date: string
  completed: boolean
  completed_at: string | null
  completed_by_name: string | null
  completed_by_employee_id: string | null
}

interface ChecklistReport {
  checklist_id: string
  template_name: string
  area_name: string
  completions: ChecklistCompletion[]
}

interface LocationAreaReport {
  location_id: string
  location_name: string
  areas: {
    area_id: string
    area_name: string
    checklists: ChecklistReport[]
  }[]
}

interface Location {
  id: string
  name: string
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [checklistReportData, setChecklistReportData] = useState<LocationAreaReport[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchReport()
    } else if (activeTab === 'checklist') {
      fetchLocations()
    }
  }, [month, activeTab])

  useEffect(() => {
    if (activeTab === 'checklist' && selectedLocation) {
      fetchChecklistReport()
    }
  }, [startDate, endDate, selectedLocation, activeTab])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations')
      const result = await response.json()
      setLocations(result.data || [])
      if (result.data?.length > 0 && !selectedLocation) {
        setSelectedLocation(result.data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/reports?month=${month}`)
      const result = await response.json()
      setReportData(result.data)
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChecklistReport = async () => {
    if (!selectedLocation) return
    
    setChecklistLoading(true)
    try {
      const response = await fetch(`/api/admin/reports/checklist?startDate=${startDate}&endDate=${endDate}&locationId=${selectedLocation}`)
      const result = await response.json()
      setChecklistReportData(result.data || [])
    } catch (error) {
      console.error('Failed to fetch checklist report:', error)
    } finally {
      setChecklistLoading(false)
    }
  }

  const getDaysInRange = () => {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      return eachDayOfInterval({ start, end })
    } catch {
      return []
    }
  }

  const exportToExcel = () => {
    if (checklistReportData.length === 0) return

    const days = getDaysInRange()
    let csvContent = 'data:text/csv;charset=utf-8,'
    
    // Header row
    const headers = ['Location', 'Area', 'Checklist', ...days.map(d => format(d, 'MMM d'))]
    csvContent += headers.join(',') + '\n'

    // Data rows
    checklistReportData.forEach(location => {
      location.areas.forEach(area => {
        area.checklists.forEach(checklist => {
          const row = [
            `"${location.location_name}"`,
            `"${area.area_name}"`,
            `"${checklist.template_name}"`,
            ...checklist.completions.map(c => {
              if (c.completed) {
                const employeeName = c.completed_by_name || 'Unknown'
                const employeeId = c.completed_by_employee_id || ''
                const time = c.completed_at ? format(new Date(c.completed_at), 'HH:mm') : ''
                return `"✓ ${employeeName} (${employeeId}) ${time}"`
              }
              return '✗'
            })
          ]
          csvContent += row.join(',') + '\n'
        })
      })
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `checklist-report-${startDate}-to-${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">View attendance analytics and job checklist completion</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'attendance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Attendance Report
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'checklist'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Checklist Completion Report
          </button>
        </nav>
      </div>

      {/* Attendance Report Tab */}
      {activeTab === 'attendance' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Monthly Attendance</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600">Loading report...</div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90 mb-2">Total Employees</h3>
                  <p className="text-4xl font-bold">{reportData?.totalEmployees || 0}</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90 mb-2">Average Attendance</h3>
                  <p className="text-4xl font-bold">{reportData?.avgAttendance || 0}%</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-sm font-medium opacity-90 mb-2">Total Working Hours</h3>
                  <p className="text-4xl font-bold">{reportData?.totalHours || 0}h</p>
                </div>
              </div>

              {/* Employee Details Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Employee Details</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Present
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Hours/Day
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData?.employees?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No data available for this month
                          </td>
                        </tr>
                      ) : (
                        reportData?.employees?.map((emp) => (
                          <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {emp.employee_id || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {emp.full_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {emp.department || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {emp.days_present}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {emp.total_hours}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {emp.avg_hours}h
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => alert('Export functionality would be implemented here')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  📥 Export to CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Checklist Completion Report Tab */}
      {activeTab === 'checklist' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Job Checklist Completion</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Location:</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {!selectedLocation ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <p className="text-yellow-800 font-medium">Please select a location to view the report</p>
            </div>
          ) : checklistLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600">Loading checklist report...</div>
            </div>
          ) : checklistReportData.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No checklist data available for the selected location and date range
            </div>
          ) : (
            <div className="space-y-6">
              {checklistReportData.map((location) => (
                <div key={location.location_id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                    <h3 className="text-lg font-bold text-blue-900">📍 {location.location_name}</h3>
                  </div>
                  
                  {location.areas.map((area) => (
                    <div key={area.area_id} className="border-b border-gray-200 last:border-b-0">
                      <div className="px-6 py-3 bg-gray-50">
                        <h4 className="text-md font-semibold text-gray-800">🏢 {area.area_name}</h4>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase sticky left-0 bg-gray-100 z-10">
                                Checklist
                              </th>
                              {getDaysInRange().map((day) => (
                                <th key={day.toISOString()} className="px-3 py-3 text-center text-xs font-medium text-gray-600 min-w-[60px]">
                                  <div>{format(day, 'MMM')}</div>
                                  <div className="text-lg font-bold">{format(day, 'd')}</div>
                                  <div className="text-xs">{format(day, 'EEE')}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {area.checklists.map((checklist) => (
                              <tr key={checklist.checklist_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                  ✓ {checklist.template_name}
                                </td>
                                {getDaysInRange().map((day) => {
                                  const dayStr = format(day, 'yyyy-MM-dd')
                                  const completion = checklist.completions.find(c => c.date === dayStr)
                                  return (
                                    <td key={day.toISOString()} className="px-3 py-3 text-center">
                                      {completion?.completed ? (
                                        <div 
                                          className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full cursor-help" 
                                          title={`Completed by: ${completion.completed_by_name || 'Unknown'} (${completion.completed_by_employee_id || 'N/A'})\nTime: ${completion.completed_at ? format(new Date(completion.completed_at), 'HH:mm') : 'N/A'}`}
                                        >
                                          <span className="text-green-600 text-lg">✓</span>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-full" title="Not completed">
                                          <span className="text-red-600 text-lg">✗</span>
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  📥 Export to CSV
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
