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

export interface AttendanceWithProfile extends Omit<Attendance, 'profiles'> {
  profiles: {
    full_name: string
    employee_id: string
    department: string | null
  }
}
