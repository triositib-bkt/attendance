import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if coordinates are within allowed radius of any work location
 */
export function isWithinAllowedLocation(
  latitude: number,
  longitude: number,
  locations: Array<{ latitude: number; longitude: number; radius_meters: number }>
): boolean {
  return locations.some((location) => {
    const distance = calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    )
    return distance <= location.radius_meters
  })
}

/**
 * Format duration in milliseconds to hours and minutes
 */
export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

/**
 * Calculate working hours between check-in and check-out
 */
export function calculateWorkingHours(
  checkIn: string,
  checkOut: string | null
): number {
  if (!checkOut) return 0
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return diff / (1000 * 60 * 60) // Convert to hours
}
