# Employee Schedule Feature

## Overview
The attendance system now includes employee scheduling functionality that tracks work hours by day of week and automatically determines if employees are late based on their scheduled shift times.

## Features

### 1. Schedule Management (Admin)
- **Add Schedules**: Set shift times for employees by day of week
- **View Schedules**: See all employee schedules grouped by employee
- **Filter**: Filter schedules by specific employee or view all
- **Delete Schedules**: Remove schedules when no longer needed
- **Day-based**: Configure different shifts for each day of the week

### 2. Schedule Integration with Attendance

#### Check-In Status Determination
- **On Time**: Check-in within 15 minutes of scheduled shift start
- **Late**: Check-in more than 15 minutes after scheduled shift start
- Status automatically set in attendance record

#### Employee Dashboard
- **Today's Schedule**: Shows shift times for current day
- **Visible on card**: Displayed before check-in to remind employees
- **Real-time**: Updates daily based on current day of week

### 3. Location + Schedule Validation
Both location and schedule are checked independently:
- **Location Valid + On Time**: ✓ Normal check-in
- **Location Valid + Late**: ⏰ Late arrival message
- **Location Invalid + On Time**: ⚠️ Location warning only
- **Location Invalid + Late**: ⚠️ Location warning + ⏰ Late message

## Database Schema

### employee_schedules Table
```sql
id UUID PRIMARY KEY
user_id UUID (references profiles)
day_of_week INTEGER (0=Sunday, 1=Monday, ..., 6=Saturday)
shift_start TIME (HH:MM:SS format)
shift_end TIME (HH:MM:SS format)
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

**Unique Constraint**: One active schedule per employee per day

## Setup Instructions

### 1. Run Database Migration
Execute the SQL in `schedule-schema.sql`:
```bash
# In Supabase SQL Editor, run schedule-schema.sql
```

### 2. Add Employee Schedules
1. Navigate to **Admin Panel → Schedules**
2. Click **Add Schedule** button
3. Select employee from dropdown
4. Choose day of week (Monday-Sunday)
5. Set shift start time (e.g., 09:00)
6. Set shift end time (e.g., 17:00)
7. Click **Add Schedule**

### 3. Configure Multiple Days
- Add separate schedule entries for each working day
- Example: Monday-Friday with same hours = 5 separate schedules
- Can have different hours for different days

## API Endpoints

### Admin Schedules API
**GET /api/admin/schedules**
- Query param: `?userId=<user_id>` (optional)
- Returns: All schedules (filtered by user if provided)

**POST /api/admin/schedules**
- Body: `{ user_id, day_of_week, shift_start, shift_end }`
- Creates new schedule
- Validates: No duplicate schedules for same user/day

**PUT /api/admin/schedules/[id]**
- Body: `{ shift_start, shift_end }`
- Updates schedule times

**DELETE /api/admin/schedules/[id]**
- Removes schedule

### Employee Schedule API
**GET /api/schedule**
- Returns current day's schedule for authenticated user
- Used by dashboard to show today's shift

### Attendance API (Updated)
**POST /api/attendance**
- Now checks schedule and sets status:
  - `present`: On time
  - `late`: More than 15 minutes after shift start
- Returns additional fields:
  - `status`: 'present' or 'late'
  - `schedule`: { shift_start, shift_end } if exists

## Late Threshold Configuration
Currently hardcoded to 15 minutes after shift start.

To change, edit `app/api/attendance/route.ts`:
```typescript
const lateThreshold = new Date(shiftStart.getTime() + 15 * 60000) // Change 15 to desired minutes
```

## Use Cases

### Regular Office Schedule
- Monday-Friday: 09:00-17:00
- Create 5 schedules (day_of_week: 1-5)
- Employees late after 09:15 AM

### Shift Work
- Different times per day
- Monday: 08:00-16:00 (day shift)
- Tuesday: 16:00-00:00 (evening shift)
- Wednesday: 00:00-08:00 (night shift)

### Part-Time
- Only specific days
- Monday: 09:00-13:00
- Wednesday: 09:00-13:00
- Friday: 09:00-13:00

### Flexible/No Schedule
- Don't create schedule entries
- All check-ins marked as "present"
- No late detection

## Admin Views

### Schedules Page
- **Desktop**: Table view with all days shown as badges
- **Mobile**: Card view with schedules listed
- **Actions**: Delete button per schedule
- **Pagination**: 10 employees per page

### Schedule Display Format
- Desktop: `Mon: 09:00-17:00` (badges)
- Mobile: Full day name with times

## Employee Views

### Dashboard Card
When not checked in:
```
Ready to start your day?
Check in to begin tracking

Today's Schedule
🕐 09:00 - 17:00
```

### After Check-In
Schedule disappears, replaced by working duration timer

### Late Check-In Message
```
✓ Checked in successfully! ⏰ (Late arrival)
```

## Benefits

1. **Automated Status**: No manual late marking needed
2. **Clear Expectations**: Employees see their schedule
3. **Flexibility**: Different schedules per day/employee
4. **Audit Trail**: Schedule stored with attendance record
5. **Fair Treatment**: Consistent 15-minute grace period
6. **Transparency**: Employees immediately know if late

## Future Enhancements

- **Overtime Calculation**: Auto-calculate hours beyond shift_end
- **Break Times**: Configure lunch/break periods
- **Shift Swapping**: Allow employees to trade shifts
- **Multiple Shifts**: Support split shifts in same day
- **Notifications**: Alert employees before shift starts
- **Schedule Templates**: Quick-apply common schedules
- **Holiday Schedules**: Special hours for holidays
- **Adjustable Grace**: Per-employee late threshold
- **Early Check-In**: Bonus for checking in early
- **Reports**: Late arrival trends and statistics

## Troubleshooting

**Schedule not showing on dashboard**
- Check day_of_week matches today (0=Sunday)
- Verify is_active = true
- Ensure user_id matches employee

**Status always "present" even when late**
- Verify schedule exists for today
- Check shift_start time is before check-in
- Confirm 15-minute threshold calculation

**Can't add schedule - "already exists" error**
- Only one active schedule per employee per day
- Delete old schedule first, then add new one
- Or update existing schedule instead

**Wrong day of week**
- JavaScript: 0=Sunday, 6=Saturday
- Database stores same format
- Check `new Date().getDay()` matches expected
