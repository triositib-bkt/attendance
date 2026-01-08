# Location Validation Feature

## Overview
The attendance system now includes GPS location validation that checks if employees are within allowed work locations when checking in or out. **Employees can still check in/out regardless of location**, but the system flags attendance records when they occur outside designated areas.

## How It Works

### 1. Location Check
When an employee checks in or out:
- System captures GPS coordinates
- Calculates distance to all active work locations
- Determines if within allowed radius (default: 100 meters)
- **Allows the attendance action regardless of location**
- Stores validation flag in database

### 2. Visual Indicators

#### Attendance Button (Dashboard)
- **Success with Location Warning**: Shows yellow warning banner when outside allowed area
- Warning includes:
  - Distance from nearest location (in km)
  - Name of nearest location
  - Message: "Your attendance was recorded but flagged for review"
- Banner stays visible for 5 seconds

#### Attendance History
- **Date Column**: Shows ⚠️ "Location Issue" badge if either check-in or check-out was invalid
- **New Location Column**: 
  - ⚠️ Check-in: Red badge if check-in was outside allowed area
  - ⚠️ Check-out: Red badge if check-out was outside allowed area
  - ✓ Valid: Green badge if both check-in and check-out were valid

### 3. Database Schema
New columns added to `attendance` table:
```sql
check_in_location_valid BOOLEAN DEFAULT true
check_out_location_valid BOOLEAN DEFAULT true
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL in `add-location-validation.sql`:
```bash
# In Supabase SQL Editor
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_in_location_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS check_out_location_valid BOOLEAN DEFAULT true;
```

### 2. Configure Work Locations
1. Go to Admin Panel → Locations
2. Add work locations with:
   - Name (e.g., "Main Office")
   - GPS coordinates (latitude/longitude)
   - Radius in meters (default: 100m)
3. Set locations as active/inactive

### 3. Test Location Validation
1. Check in from within allowed location → Should show success without warning
2. Check in from outside allowed location → Should show success with yellow warning banner
3. View history → Location column shows validation status

## API Response
The attendance API now returns additional fields:
```typescript
{
  data: Attendance,
  error: any,
  locationValid: boolean,        // true if within allowed radius
  distance: number,              // distance in meters to nearest location
  nearestLocation: string        // name of nearest location
}
```

## Benefits
1. **No Blocking**: Employees can always record attendance (important for emergencies, remote work)
2. **Audit Trail**: Admins can identify unusual check-ins for review
3. **Flexibility**: System accommodates special situations while maintaining oversight
4. **Transparency**: Employees know immediately if their location was flagged

## Admin Review Process
1. Navigate to Admin Panel → Attendance
2. Look for records with ⚠️ Location Issue badges
3. Review individual records in Location column
4. Contact employees if needed to verify legitimate reasons

## Future Enhancements
- Filter attendance records by location validity
- Export flagged records for review
- Send notifications to admins for out-of-area check-ins
- Add location override feature for approved remote work
- Show distance details in history (not just flag)
