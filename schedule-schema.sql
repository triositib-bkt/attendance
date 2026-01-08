-- Add employee schedules table
-- Run this in your Supabase SQL Editor

CREATE TABLE employee_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,
  effective_date DATE, -- Start date for this schedule (optional, for date-specific schedules)
  end_date DATE, -- End date for this schedule (optional, for date-specific schedules)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_employee_schedules_user_id ON employee_schedules(user_id);
CREATE INDEX idx_employee_schedules_day_of_week ON employee_schedules(day_of_week);
CREATE INDEX idx_employee_schedules_user_day ON employee_schedules(user_id, day_of_week);
CREATE INDEX idx_employee_schedules_location ON employee_schedules(location_id);
CREATE INDEX idx_employee_schedules_dates ON employee_schedules(effective_date, end_date);

-- Note: Removed unique constraint to allow multiple schedules per day with different dates/locations

-- Enable Row Level Security
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_schedules
CREATE POLICY "Users can view their own schedule" ON employee_schedules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all schedules" ON employee_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can insert schedules" ON employee_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update schedules" ON employee_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete schedules" ON employee_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Add comments
COMMENT ON TABLE employee_schedules IS 'Employee work schedules by day of week, location, and date range';
COMMENT ON COLUMN employee_schedules.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN employee_schedules.shift_start IS 'Scheduled shift start time';
COMMENT ON COLUMN employee_schedules.shift_end IS 'Scheduled shift end time';
COMMENT ON COLUMN employee_schedules.location_id IS 'Optional: Specific work location for this schedule';
COMMENT ON COLUMN employee_schedules.effective_date IS 'Optional: Start date for date-specific schedules. NULL means recurring weekly schedule';
COMMENT ON COLUMN employee_schedules.end_date IS 'Optional: End date for date-specific schedules. NULL means no end date';
