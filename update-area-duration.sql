-- Update office_areas: Remove date fields, add duration_minutes
-- Add start_time to job_checklists for tracking actual work time

-- Remove date columns from office_areas if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_areas' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE office_areas DROP COLUMN start_date;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_areas' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE office_areas DROP COLUMN end_date;
  END IF;
END $$;

-- Add duration_minutes to office_areas (guideline for job completion time)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_areas' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE office_areas 
    ADD COLUMN duration_minutes INTEGER;
  END IF;
END $$;

-- Add start_time to job_checklists (when employee starts the job)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_checklists' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE job_checklists 
    ADD COLUMN start_time TIMESTAMPTZ;
  END IF;
END $$;

-- Drop old date indexes if they exist
DROP INDEX IF EXISTS idx_office_areas_dates;

-- Add index for duration queries
CREATE INDEX IF NOT EXISTS idx_office_areas_duration 
ON office_areas(duration_minutes);

-- Add comments
COMMENT ON COLUMN office_areas.duration_minutes IS 'Guideline duration in minutes for completing jobs in this area';
COMMENT ON COLUMN job_checklists.start_time IS 'When the employee started working on this job';
COMMENT ON COLUMN job_checklists.completed_at IS 'When the employee completed this job (end time)';

-- Display success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'office_areas: Added duration_minutes, removed start_date/end_date';
  RAISE NOTICE 'job_checklists: Added start_time for tracking actual work duration';
END $$;
