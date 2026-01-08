-- Job Checklist System for Office Areas
-- This allows defining recurring jobs (daily/weekly/monthly) for each office area

-- Table: job_templates
-- Defines the master list of jobs that need to be done
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id UUID NOT NULL REFERENCES office_areas(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday (for weekly jobs)
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31), -- for monthly jobs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: job_checklists
-- Individual job instances that need to be completed
CREATE TABLE IF NOT EXISTS job_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES office_areas(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_template_id, assigned_date) -- Prevent duplicate jobs for same day
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_templates_area_id ON job_templates(area_id);
CREATE INDEX IF NOT EXISTS idx_job_templates_frequency ON job_templates(frequency);
CREATE INDEX IF NOT EXISTS idx_job_templates_is_active ON job_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_job_checklists_template_id ON job_checklists(job_template_id);
CREATE INDEX IF NOT EXISTS idx_job_checklists_area_id ON job_checklists(area_id);
CREATE INDEX IF NOT EXISTS idx_job_checklists_assigned_date ON job_checklists(assigned_date);
CREATE INDEX IF NOT EXISTS idx_job_checklists_completed_at ON job_checklists(completed_at);

-- Enable RLS
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_templates
-- Allow authenticated users to read job templates
CREATE POLICY "Allow authenticated users to read job templates"
  ON job_templates FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage job templates
CREATE POLICY "Allow admins to manage job templates"
  ON job_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for job_checklists
-- Allow authenticated users to read job checklists
CREATE POLICY "Allow authenticated users to read job checklists"
  ON job_checklists FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage all job checklists
CREATE POLICY "Allow admins to manage job checklists"
  ON job_checklists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow employees to complete job checklists (update only)
CREATE POLICY "Allow employees to complete job checklists"
  ON job_checklists FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    completed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE job_templates IS 'Master list of recurring jobs for office areas';
COMMENT ON TABLE job_checklists IS 'Individual job instances to be completed';
COMMENT ON COLUMN job_templates.frequency IS 'How often the job repeats: daily, weekly, or monthly';
COMMENT ON COLUMN job_templates.day_of_week IS 'For weekly jobs: 0=Sunday through 6=Saturday';
COMMENT ON COLUMN job_templates.day_of_month IS 'For monthly jobs: 1-31';
COMMENT ON COLUMN job_checklists.assigned_date IS 'The date this job needs to be completed';

-- Function to generate daily job checklists (run this daily via cron job or manually)
CREATE OR REPLACE FUNCTION generate_daily_checklists(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
  daily_count INTEGER := 0;
  weekly_count INTEGER := 0;
  monthly_count INTEGER := 0;
BEGIN
  -- Generate daily jobs
  INSERT INTO job_checklists (job_template_id, area_id, assigned_date)
  SELECT 
    jt.id,
    jt.area_id,
    target_date
  FROM job_templates jt
  WHERE jt.is_active = true
    AND jt.frequency = 'daily'
    AND NOT EXISTS (
      SELECT 1 FROM job_checklists jc
      WHERE jc.job_template_id = jt.id
        AND jc.assigned_date = target_date
    );
  
  GET DIAGNOSTICS daily_count = ROW_COUNT;
  
  -- Generate weekly jobs (based on day_of_week)
  INSERT INTO job_checklists (job_template_id, area_id, assigned_date)
  SELECT 
    jt.id,
    jt.area_id,
    target_date
  FROM job_templates jt
  WHERE jt.is_active = true
    AND jt.frequency = 'weekly'
    AND jt.day_of_week = EXTRACT(DOW FROM target_date)::INTEGER
    AND NOT EXISTS (
      SELECT 1 FROM job_checklists jc
      WHERE jc.job_template_id = jt.id
        AND jc.assigned_date = target_date
    );
  
  GET DIAGNOSTICS weekly_count = ROW_COUNT;
  
  -- Generate monthly jobs (based on day_of_month)
  INSERT INTO job_checklists (job_template_id, area_id, assigned_date)
  SELECT 
    jt.id,
    jt.area_id,
    target_date
  FROM job_templates jt
  WHERE jt.is_active = true
    AND jt.frequency = 'monthly'
    AND jt.day_of_month = EXTRACT(DAY FROM target_date)::INTEGER
    AND NOT EXISTS (
      SELECT 1 FROM job_checklists jc
      WHERE jc.job_template_id = jt.id
        AND jc.assigned_date = target_date
    );
  
  GET DIAGNOSTICS monthly_count = ROW_COUNT;
  
  -- Calculate total
  inserted_count := daily_count + weekly_count + monthly_count;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Example data (uncomment to insert sample jobs)
-- INSERT INTO job_templates (area_id, title, description, frequency) VALUES
-- ((SELECT id FROM office_areas WHERE name = 'Reception' LIMIT 1), 'Clean reception desk', 'Wipe down desk and organize materials', 'daily'),
-- ((SELECT id FROM office_areas WHERE name = 'Reception' LIMIT 1), 'Check visitor log', 'Review and file visitor records', 'daily'),
-- ((SELECT id FROM office_areas WHERE name = 'Office Floor 1' LIMIT 1), 'Empty trash bins', 'Collect and dispose of trash from all bins', 'daily'),
-- ((SELECT id FROM office_areas WHERE name = 'Meeting Rooms' LIMIT 1), 'Deep clean meeting rooms', 'Vacuum, sanitize tables and chairs', 'weekly', 1), -- Monday
-- ((SELECT id FROM office_areas WHERE name = 'Office Floor 1' LIMIT 1), 'Inventory check', 'Count supplies and update inventory log', 'monthly', NULL, 1); -- 1st of month
