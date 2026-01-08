export type UserRole = 'admin' | 'manager' | 'employee'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department: string | null
  position: string | null
  employee_id: string | null
  phone: string | null
  password_hash: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  user_id: string
  check_in: string
  check_out: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  check_out_lat: number | null
  check_out_lng: number | null
  check_in_location_valid: boolean
  check_out_location_valid: boolean
  status: 'present' | 'late' | 'absent'
  notes: string | null
  created_at: string
  profiles?: Profile
}

export interface WorkLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  created_at: string
}

export interface OfficeArea {
  id: string
  location_id: string
  name: string
  description: string | null
  duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkLocationWithAreas extends WorkLocation {
  office_areas?: OfficeArea[]
}
export interface JobTemplate {
  id: string
  area_id: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null // 0=Sunday, 6=Saturday
  day_of_month: number | null // 1-31
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JobChecklist {
  id: string
  job_template_id: string
  area_id: string
  assigned_date: string
  start_time: string | null
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
}

export interface JobChecklistWithDetails extends JobChecklist {
  job_template: JobTemplate
  office_area: OfficeArea
  completed_by_user?: {
    full_name: string
  }
}
export interface AttendanceWithProfile extends Omit<Attendance, 'profiles'> {
  profiles: {
    full_name: string
    employee_id: string
    department: string | null
  }
}

export interface EmployeeSchedule {
  id: string
  user_id: string
  day_of_week: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  shift_start: string // HH:MM:SS format
  shift_end: string // HH:MM:SS format
  location_id: string | null
  effective_date: string | null // YYYY-MM-DD format
  end_date: string | null // YYYY-MM-DD format
  is_active: boolean
  created_at: string
  updated_at: string
}
