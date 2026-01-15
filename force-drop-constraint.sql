-- Force drop the day_of_week constraint/index
-- This script finds and drops ANY constraint or index with day_of_week

-- Step 1: Drop as an INDEX (not constraint)
DROP INDEX IF EXISTS idx_employee_schedules_user_day_unique;
DROP INDEX IF EXISTS idx_employee_schedules_user_day;

-- Step 2: Check if it's a unique constraint and drop it
DO $$ 
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'employee_schedules'::regclass
    AND conname LIKE '%day%'
  LOOP
    EXECUTE 'ALTER TABLE employee_schedules DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
    RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
  END LOOP;
END $$;

-- Step 3: List all remaining indexes on the table to verify
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'employee_schedules'
ORDER BY indexname;

-- Step 4: List all remaining constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'employee_schedules'::regclass
ORDER BY conname;

-- Step 5: Create the new date-based unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_schedules_user_location_date_unique 
ON employee_schedules(user_id, location_id, effective_date) 
WHERE is_active = true;

COMMENT ON INDEX idx_employee_schedules_user_location_date_unique IS 
'Ensures an employee can only have one active schedule per location per specific date';
