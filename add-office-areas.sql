-- Create office_areas table to manage areas/zones within locations
-- This normalized approach allows better management and future expansion

CREATE TABLE IF NOT EXISTS office_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES work_locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_office_areas_location_id ON office_areas(location_id);
CREATE INDEX IF NOT EXISTS idx_office_areas_is_active ON office_areas(is_active);

-- Add RLS policies
ALTER TABLE office_areas ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active office areas
CREATE POLICY "Allow authenticated users to read office areas"
  ON office_areas FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage office areas
CREATE POLICY "Allow admins to manage office areas"
  ON office_areas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE office_areas IS 'Office areas/zones within work locations for job scheduling, checklists, and work assignments';
COMMENT ON COLUMN office_areas.location_id IS 'Reference to the work location';
COMMENT ON COLUMN office_areas.name IS 'Name of the office area (e.g., Reception, Floor 1, Cafeteria)';
COMMENT ON COLUMN office_areas.description IS 'Optional description of the area';

-- Example data (uncomment and modify as needed)
-- INSERT INTO office_areas (location_id, name, description) VALUES
-- ((SELECT id FROM work_locations WHERE name = 'Main Office' LIMIT 1), 'Reception', 'Main entrance and reception desk'),
-- ((SELECT id FROM work_locations WHERE name = 'Main Office' LIMIT 1), 'Office Floor 1', 'First floor office space'),
-- ((SELECT id FROM work_locations WHERE name = 'Main Office' LIMIT 1), 'Office Floor 2', 'Second floor office space'),
-- ((SELECT id FROM work_locations WHERE name = 'Main Office' LIMIT 1), 'Meeting Rooms', 'Conference and meeting spaces'),
-- ((SELECT id FROM work_locations WHERE name = 'Main Office' LIMIT 1), 'Cafeteria', 'Employee dining area');
