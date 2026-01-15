-- Fix schedule constraint to allow date-specific scheduling
-- This removes the day_of_week unique constraint and adds a proper date-based one

-- Step 1: Drop the problematic unique constraint on (user_id, day_of_week)
DO $$ 
BEGIN
  -- Check for the constraint by different possible names
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'idx_employee_schedules_user_day_unique'
  ) THEN
    ALTER TABLE employee_schedules DROP CONSTRAINT idx_employee_schedules_user_day_unique;
    RAISE NOTICE 'Dropped constraint: idx_employee_schedules_user_day_unique';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employee_schedules_user_id_day_of_week_key'
  ) THEN
    ALTER TABLE employee_schedules DROP CONSTRAINT employee_schedules_user_id_day_of_week_key;
    RAISE NOTICE 'Dropped constraint: employee_schedules_user_id_day_of_week_key';
  END IF;
END $$;

-- Step 2: Create a unique constraint for date-specific schedules
-- This allows an employee to have multiple schedules (different dates) at the same location
-- but prevents duplicate schedules for the same date, location, and employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_schedules_user_location_date_unique 
ON employee_schedules(user_id, location_id, effective_date) 
WHERE is_active = true;

-- Step 3: Add comment to clarify the new behavior
COMMENT ON INDEX idx_employee_schedules_user_location_date_unique IS 
'Ensures an employee can only have one active schedule per location per specific date';

-- Verification query to check constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'employee_schedules'::regclass
ORDER BY conname;
