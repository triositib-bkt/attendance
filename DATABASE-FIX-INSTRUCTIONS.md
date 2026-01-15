# Database Constraint Fix - Date-Specific Scheduling

## Problem
The database had a unique constraint on `(user_id, day_of_week)` which limited employees to only ONE schedule per day of week (e.g., one Monday schedule, one Tuesday schedule). This prevented creating schedules for specific dates like Jan 1, Jan 2, Jan 3, etc.

## Solution
We need to:
1. Remove the `day_of_week` unique constraint
2. Add a new unique constraint on `(user_id, location_id, effective_date)` for date-specific schedules

## Steps to Fix

### Step 1: Run the SQL Migration
1. Go to your Supabase Dashboard → SQL Editor
2. Open the file: `fix-schedule-constraint.sql`
3. Copy the entire contents
4. Paste into Supabase SQL Editor and run it

This will:
- Drop the old `(user_id, day_of_week)` unique constraint
- Create a new unique index on `(user_id, location_id, effective_date)`
- Allow employees to have schedules for every specific date

### Step 2: Verify the Changes
After running the migration, you can verify it worked by running this query:

```sql
-- Check current constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'employee_schedules'::regclass
ORDER BY conname;
```

You should see:
- ✅ `idx_employee_schedules_user_location_date_unique` - the new constraint
- ❌ No `idx_employee_schedules_user_day_unique` or similar day_of_week constraint

### Step 3: Test Schedule Generation
1. Go to Admin → Schedules
2. Click "Generate Schedules"
3. Select:
   - Employee
   - Location
   - Date range: Jan 1 - Jan 31, 2026
   - Shift times
4. Generate

**Expected Result:**
- ✅ Should create 31 schedules (one for each day)
- ✅ Should show "Generated 31 schedule(s). Skipped 0."

## What Changed in the Code

### 1. Database Constraint (`fix-schedule-constraint.sql`)
```sql
-- OLD: Limited to 7 schedules per employee (one per day of week)
(user_id, day_of_week) UNIQUE

-- NEW: Allows date-specific schedules
(user_id, location_id, effective_date) UNIQUE WHERE is_active = true
```

### 2. Schedule Generation API (`app/api/admin/schedules/generate/route.ts`)
```typescript
// OLD: Checked by day_of_week
.eq('day_of_week', dayOfWeek)

// NEW: Checks by specific date
.eq('effective_date', dateString)
```

### 3. UI Message (`app/admin/schedules/page.tsx`)
Updated the info panel to reflect date-specific scheduling instead of recurring weekly patterns.

## Benefits
✅ Employees can be scheduled for any specific date (Jan 1, Jan 2, Jan 3, etc.)
✅ No more limitation of 7 schedules per employee
✅ Bulk generation for a month creates 30-31 schedules as expected
✅ Still prevents duplicate schedules for the same date/location/employee
✅ Overwrite mode works correctly to replace existing date-specific schedules

## Troubleshooting

### If you still see "0 generated, X skipped"
- Verify the SQL migration ran successfully
- Check if there are existing schedules for those dates
- Try with "Overwrite existing schedules" checked
- Check the browser console for detailed logs

### If you get constraint errors
The old constraint might still exist. Run this to find it:
```sql
SELECT conname FROM pg_constraint 
WHERE conrelid = 'employee_schedules'::regclass;
```

Then drop it manually:
```sql
ALTER TABLE employee_schedules DROP CONSTRAINT <constraint_name>;
```
