# Notification Cleanup System

This system automatically maintains notifications by keeping only the last 2 days of data.

## Components

### 1. Database Function
**File**: `notification-cleanup.sql`

The `cleanup_old_notifications()` function deletes notifications older than 2 days (configurable).

```sql
-- Run manually in Supabase SQL Editor
SELECT cleanup_old_notifications(2); -- Returns number of deleted notifications
```

### 2. Cron API Endpoint
**File**: `app/api/cron/cleanup-notifications/route.ts`

REST API endpoint that calls the cleanup function.

**Test manually:**
```bash
curl https://your-domain.com/api/cron/cleanup-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Automated Schedule
**File**: `vercel.json`

Vercel Cron Job runs daily at 2:00 AM UTC.

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-notifications",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Setup Instructions

### Step 1: Deploy Database Function
1. Open Supabase Dashboard → SQL Editor
2. Run the contents of `notification-cleanup.sql`
3. Verify: `SELECT cleanup_old_notifications(2);`

### Step 2: Configure Environment Variable (Optional Security)
Add to Vercel/Environment:
```env
CRON_SECRET=your-random-secret-key-here
```

This prevents unauthorized access to the cleanup endpoint.

### Step 3: Deploy to Vercel
```bash
git add .
git commit -m "Add notification cleanup system"
git push
```

Vercel will automatically configure the cron job.

### Step 4: Verify Cron Job
1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Verify the job appears with schedule "0 2 * * *"
3. Check execution logs after first run

## Manual Cleanup

### Via API (Production)
```bash
curl https://your-domain.com/api/cron/cleanup-notifications
```

### Via Supabase SQL Editor
```sql
SELECT cleanup_old_notifications(2);
```

### Change Retention Period
```sql
-- Keep notifications for 7 days instead
SELECT cleanup_old_notifications(7);
```

## Schedule Format

The cron schedule `0 2 * * *` means:
- `0` - Minute (0)
- `2` - Hour (2 AM)
- `*` - Day of month (every day)
- `*` - Month (every month)
- `*` - Day of week (every day)

**Common schedules:**
- `0 2 * * *` - Daily at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 3 */2 * *` - Every 2 days at 3:00 AM

## Monitoring

### Check Last Cleanup
```sql
-- See oldest notification
SELECT MIN(created_at) as oldest_notification FROM notifications;

-- Count notifications by age
SELECT 
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 day' THEN '< 1 day'
    WHEN created_at > NOW() - INTERVAL '2 days' THEN '1-2 days'
    ELSE '> 2 days'
  END as age_group,
  COUNT(*) as count
FROM notifications
GROUP BY age_group;
```

### Vercel Logs
Check cron execution in Vercel Dashboard → Logs → Filter by "cron"

## Troubleshooting

### Cron Not Running
1. Verify Vercel Pro plan (required for cron)
2. Check `vercel.json` syntax
3. Redeploy: `vercel --prod`

### Function Not Found Error
```sql
-- Re-run the notification-cleanup.sql file in Supabase SQL Editor
```

### Unauthorized Error (401)
- Check `CRON_SECRET` environment variable matches
- Or remove authorization check in the route.ts file

## Database Impact

- Notifications are deleted with CASCADE to `notification_recipients`
- FCM tokens are NOT affected (different table)
- Read notifications are deleted after 2 days (same as unread)
- Cleanup is atomic (all or nothing transaction)

## Alternative: Manual Scheduling

If not using Vercel Cron, set up external cron:

### Using cPanel/Server Cron
```bash
0 2 * * * curl https://your-domain.com/api/cron/cleanup-notifications
```

### Using GitHub Actions
```yaml
# .github/workflows/cleanup-notifications.yml
name: Cleanup Notifications
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: curl ${{ secrets.APP_URL }}/api/cron/cleanup-notifications
```

### Using Supabase Cron Extension
```sql
-- Install pg_cron extension in Supabase (Enterprise only)
SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications(2)');
```
