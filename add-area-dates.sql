-- Add start_date and end_date to office_areas
-- This allows areas to have operational periods

-- Add start_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_areas' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE office_areas 
    ADD COLUMN start_date DATE;
  END IF;
END $$;

-- Add end_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'office_areas' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE office_areas 
    ADD COLUMN end_date DATE;
  END IF;
END $$;

-- Add check constraint to ensure end_date is after start_date
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_area_date_range'
  ) THEN
    ALTER TABLE office_areas 
    ADD CONSTRAINT check_area_date_range 
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_office_areas_dates 
ON office_areas(start_date, end_date);

-- Add comments
COMMENT ON COLUMN office_areas.start_date IS 'Start date when this area becomes operational. NULL means active from creation.';
COMMENT ON COLUMN office_areas.end_date IS 'End date when this area stops operations. NULL means indefinitely active.';

-- Display success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'office_areas table updated with start_date and end_date fields.';
END $$;
