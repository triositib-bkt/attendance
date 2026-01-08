-- Add location validation columns to attendance table
-- Run this in your Supabase SQL Editor

ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_in_location_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS check_out_location_valid BOOLEAN DEFAULT true;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_location_valid ON attendance(check_in_location_valid);
CREATE INDEX IF NOT EXISTS idx_attendance_check_out_location_valid ON attendance(check_out_location_valid);

-- Add comment to explain the columns
COMMENT ON COLUMN attendance.check_in_location_valid IS 'Indicates if check-in was within allowed location radius';
COMMENT ON COLUMN attendance.check_out_location_valid IS 'Indicates if check-out was within allowed location radius';
