# Job Checklist Photo Feature Setup

This feature allows employees to take photos when starting and completing job checklists.

## Prerequisites

Make sure you have the `SUPABASE_SERVICE_ROLE_KEY` set in your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

You can find this key in your Supabase project settings under **API** → **Service Role Key** (keep this secret!).

## Database Migration

Run the SQL migration to add photo columns:

```bash
# Run this file in your Supabase SQL Editor or via migration
psql -h <your-host> -U <your-user> -d <your-db> -f add-checklist-photos.sql
```

Or manually run:
```sql
ALTER TABLE job_checklists 
ADD COLUMN IF NOT EXISTS start_photo_url TEXT,
ADD COLUMN IF NOT EXISTS end_photo_url TEXT;
```

## Supabase Storage Setup

### 1. Create Storage Bucket

Go to Supabase Dashboard > Storage and create a new bucket:
- **Bucket name**: `checklist-photos`
- **Public bucket**: Yes (to allow viewing photos)

Or run in SQL Editor:
```sql
insert into storage.buckets (id, name, public) 
values ('checklist-photos', 'checklist-photos', true);
```

### 2. Set Storage Policies

Since we're uploading through an API endpoint using the service role, we only need simple policies.

Run these policies in Supabase SQL Editor:

```sql
-- Allow public to view photos (since bucket is public)
create policy "Allow public to view checklist photos"
on storage.objects for select
using (bucket_id = 'checklist-photos');

-- Service role bypasses RLS, so no insert/delete policies needed
-- The API endpoint handles authentication and uploads with service role
```

**Alternative: If you want to allow direct client uploads (not recommended for this setup):**
```sql
-- Allow authenticated users to upload photos directly
create policy "Allow authenticated users to upload checklist photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'checklist-photos');
```

**Note:** Make sure you've run the database migration first to add the photo columns to the `job_checklists` table.

## How It Works

### Starting a Job:
1. Click "▶ Start Job"
2. Camera modal opens
3. Take a photo of the job area/condition
4. Photo is uploaded to Supabase storage
5. Job starts with photo URL saved

### Completing a Job:
1. Click "✓ Complete Job"
2. Camera modal opens
3. Take a photo of the completed work
4. Photo is uploaded to Supabase storage
5. Notes modal opens for additional comments
6. Job is completed with photo URL saved

## Features

- **Camera Access**: Uses device camera (front or back)
- **Photo Capture**: Take photo with one click
- **Retake Option**: Can retake photo before uploading
- **Photo Storage**: Photos stored in Supabase storage bucket
- **Photo URLs**: Saved in database for later viewing
- **Mobile Optimized**: Works on both desktop and mobile devices

## Viewing Photos

Photos can be viewed by accessing the URLs stored in:
- `start_photo_url`: Photo taken when job started
- `end_photo_url`: Photo taken when job completed

You can display these in the admin reports or job details pages.

## Troubleshooting

**Camera not working:**
- Ensure HTTPS is enabled (cameras require secure context)
- Check browser permissions for camera access
- On mobile, ensure app has camera permissions

**Upload failing:**
- Check Supabase storage bucket exists
- Verify storage policies are set correctly
- Check network connectivity
- Verify Supabase project URL and keys are correct

**Photos not displaying:**
- Ensure bucket is set to public
- Check that public read policy is enabled
- Verify photo URLs are correct in database
