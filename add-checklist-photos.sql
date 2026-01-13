-- Add photo fields to job_checklists table
ALTER TABLE job_checklists 
ADD COLUMN IF NOT EXISTS start_photo_url TEXT,
ADD COLUMN IF NOT EXISTS end_photo_url TEXT;

COMMENT ON COLUMN job_checklists.start_photo_url IS 'Photo taken when starting the job checklist';
COMMENT ON COLUMN job_checklists.end_photo_url IS 'Photo taken when completing the job checklist';

-- Create storage bucket for checklist photos if it doesn't exist
-- Run this in Supabase SQL Editor:
-- insert into storage.buckets (id, name, public) values ('checklist-photos', 'checklist-photos', true);

-- Create storage policy for checklist photos
-- Run this in Supabase SQL Editor:
-- create policy "Allow authenticated users to upload checklist photos"
-- on storage.objects for insert
-- with check (bucket_id = 'checklist-photos' AND auth.role() = 'authenticated');

-- create policy "Allow public to view checklist photos"
-- on storage.objects for select
-- using (bucket_id = 'checklist-photos');
