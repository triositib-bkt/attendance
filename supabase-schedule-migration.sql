-- Migration: Update employee_schedules table for date-based scheduling
-- Date: January 8, 2026
-- Description: Add location and date fields to support date-specific scheduling

-- Add location_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_schedules' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE employee_schedules 
    ADD COLUMN location_id uuid REFERENCES work_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add effective_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_schedules' AND column_name = 'effective_date'
  ) THEN
    ALTER TABLE employee_schedules 
    ADD COLUMN effective_date date;
  END IF;
END $$;

-- Add end_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_schedules' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE employee_schedules 
    ADD COLUMN end_date date;
  END IF;
END $$;

-- Drop the unique constraint if it exists (to allow multiple schedules per day)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employee_schedules_user_id_day_of_week_key'
  ) THEN
    ALTER TABLE employee_schedules 
    DROP CONSTRAINT employee_schedules_user_id_day_of_week_key;
  END IF;
END $$;

-- Create index on location_id for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_schedules_location_id 
ON employee_schedules(location_id);

-- Create index on effective_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_employee_schedules_effective_date 
ON employee_schedules(effective_date);

-- Create composite index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_employee_schedules_user_date_range 
ON employee_schedules(user_id, effective_date, end_date);

-- Add check constraint to ensure end_date is after effective_date
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_schedule_date_range'
  ) THEN
    ALTER TABLE employee_schedules 
    ADD CONSTRAINT check_schedule_date_range 
    CHECK (end_date IS NULL OR effective_date IS NULL OR end_date >= effective_date);
  END IF;
END $$;

-- Add comment to the table for documentation
COMMENT ON TABLE employee_schedules IS 'Employee work schedules with date-specific and recurring support. Date-specific schedules (with effective_date/end_date) take priority over recurring schedules (day_of_week only).';

COMMENT ON COLUMN employee_schedules.location_id IS 'Optional: specific work location for this schedule';
COMMENT ON COLUMN employee_schedules.effective_date IS 'Start date for date-specific schedules. NULL for recurring weekly schedules.';
COMMENT ON COLUMN employee_schedules.end_date IS 'End date for date-specific schedules. NULL for recurring weekly schedules.';

-- Display success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'employee_schedules table updated with location and date fields.';
END $$;
