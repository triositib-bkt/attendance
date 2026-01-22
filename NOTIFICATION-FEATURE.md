# Notification Feature - Complete Guide

This document provides a complete overview of the notification system with FCM integration.

## ✅ Completed Implementation

### 1. Database Schema
- **File**: `notification-schema.sql`
- **Tables**:
  - `notifications`: Stores notification messages
  - `notification_recipients`: Tracks which users receive notifications
  - `fcm_tokens`: Stores Firebase Cloud Messaging device tokens
- **Functions**:
  - `get_unread_notification_count()`: Get unread count for a user
  - `mark_all_notifications_read()`: Mark all as read for a user

### 2. TypeScript Types
- **File**: `lib/types.ts`
- Added:
  - `Notification`
  - `NotificationRecipient`
  - `NotificationWithDetails`
  - `FCMToken`

### 3. API Routes

#### User APIs
- **GET `/api/notifications`**: Get notifications for current user
  - Query params: `unread_only`, `limit`
  - Returns list of notifications with read status
  
- **POST `/api/notifications`**: Mark notification as read
  - Body: `{ notification_id }` or `{ mark_all_read: true }`
  
- **GET `/api/notifications/unread-count`**: Get unread count
  
- **POST `/api/notifications/fcm-token`**: Register FCM token
  - Body: `{ token, device_type, device_info }`
  
- **DELETE `/api/notifications/fcm-token`**: Remove FCM token
  - Query param: `token`

#### Admin APIs
- **GET `/api/admin/notifications`**: Get all notifications (admin only)
  - Query param: `limit`
  
- **POST `/api/admin/notifications`**: Send notification (admin only)
  - Body:
    ```json
    {
      "title": "Notification Title",
      "message": "Notification message",
      "type": "info|success|warning|error|announcement",
      "is_broadcast": true,
      "recipient_ids": ["user-id-1", "user-id-2"]
    }
    ```
  - If `is_broadcast` is true, sends to all active users
  - Otherwise sends to specific `recipient_ids`

### 4. Admin UI
- **Location**: `/admin/notifications`
- **Features**:
  - View all sent notifications
  - Send new notification form
  - Choose between broadcast or specific users
  - Select notification type (info, success, warning, error, announcement)
  - See recipient count and FCM delivery stats

### 5. User Dashboard
- **Location**: `/dashboard`
- **Features**:
  - Notifications tab (mobile) and section (desktop)
  - Real-time notification list
  - Unread count display
  - Mark individual notifications as read
  - Mark all as read button
  - Visual indicators for notification types
  - Relative timestamps (e.g., "2h ago")

### 6. Components
- **`NotificationsList.tsx`**: User notification list component
  - Fetches and displays notifications
  - Handles read/unread state
  - Shows notification type icons
  - Responsive design

## 📋 Setup Instructions

### Step 1: Run Database Migration
```sql
-- Run notification-schema.sql in your Supabase SQL editor
```

### Step 2: Test Without FCM (Database Only)
The system works immediately without FCM setup. Notifications are:
- ✅ Stored in database
- ✅ Displayed in dashboard
- ✅ Tracked for read/unread status

### Step 3: (Optional) Setup FCM for Push Notifications
Follow the detailed guide in `FCM-SETUP.md` to enable push notifications:
- Create Firebase project
- Configure Firebase Admin SDK
- Add service worker
- Register device tokens

## 🎯 Usage Examples

### Send Broadcast Notification
```typescript
// Admin sends to all users
POST /api/admin/notifications
{
  "title": "System Maintenance",
  "message": "The system will be under maintenance tonight from 10 PM to 12 AM.",
  "type": "announcement",
  "is_broadcast": true
}
```

### Send to Specific Users
```typescript
// Admin sends to specific employees
POST /api/admin/notifications
{
  "title": "Shift Change",
  "message": "Your shift for tomorrow has been updated.",
  "type": "info",
  "is_broadcast": false,
  "recipient_ids": ["user-id-1", "user-id-2", "user-id-3"]
}
```

### Mark Notification as Read
```typescript
// User marks specific notification as read
POST /api/notifications
{
  "notification_id": "notification-uuid"
}
```

### Mark All as Read
```typescript
// User marks all notifications as read
POST /api/notifications
{
  "mark_all_read": true
}
```

## 🎨 Notification Types

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| `info` | Blue | ℹ️ | General information |
| `success` | Green | ✅ | Success messages |
| `warning` | Yellow | ⚠️ | Warnings |
| `error` | Red | ❌ | Errors or urgent issues |
| `announcement` | Purple | 📢 | Company announcements |

## 🔒 Security & Permissions

### Admin Only
- `/admin/notifications` page
- `POST /api/admin/notifications` (send)
- `GET /api/admin/notifications` (view all)

### All Authenticated Users
- `/dashboard` notifications tab
- `GET /api/notifications` (view own)
- `POST /api/notifications` (mark read)
- `GET /api/notifications/unread-count`
- FCM token registration/removal

## 📱 Mobile & Desktop Support

### Desktop (`/dashboard`)
- Notifications shown in main content area
- After Job Checklist section
- Full width cards with detailed information

### Mobile (`/dashboard`)
- Dedicated "Notifications" tab in bottom navigation
- Bell icon (🔔)
- Optimized for small screens
- Same functionality as desktop

## 🔄 Real-time Updates

### Current Implementation
- Manual refresh when page loads
- After marking as read

### Future Enhancement (Optional)
- Add WebSocket or Server-Sent Events for real-time updates
- Auto-refresh notifications list
- Live unread count updates

## 📊 Notification Statistics

Tracked in admin interface:
- Total notifications sent
- Recipients count
- FCM delivery success/failure
- Broadcast vs targeted notifications
- Sender information

## 🧪 Testing Checklist

### Database Testing
- [ ] Run migration successfully
- [ ] Create notification via admin UI
- [ ] Verify notification appears in user dashboard
- [ ] Mark notification as read
- [ ] Mark all as read
- [ ] Broadcast to all users
- [ ] Send to specific users

### UI Testing
- [ ] Admin can access /admin/notifications
- [ ] Send notification form works
- [ ] Broadcast toggle works
- [ ] Recipient selection works
- [ ] Notification list displays correctly
- [ ] Read/unread states update
- [ ] Mobile navigation shows notifications tab
- [ ] Desktop view shows notifications section

### API Testing
```bash
# Get notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Cookie: your-session-cookie"

# Send notification (admin)
curl -X POST http://localhost:3000/api/admin/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session-cookie" \
  -d '{
    "title": "Test",
    "message": "Test message",
    "type": "info",
    "is_broadcast": true
  }'

# Mark as read
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"notification_id": "uuid"}'
```

## 🚀 Deployment Notes

### Environment Variables
None required for basic functionality (database-only mode)

For FCM (optional):
- See `FCM-SETUP.md` for full list

### Database
Ensure `notification-schema.sql` is run on production database

### Permissions
Verify Supabase RLS policies if enabled:
- `notifications` table: Admin write, user read (own)
- `notification_recipients` table: Admin write, user read (own)
- `fcm_tokens` table: User read/write (own)

## 💡 Tips

1. **Start Simple**: Use without FCM first, add push notifications later
2. **Test Broadcast**: Be careful with broadcast to all users in production
3. **Type Icons**: Use appropriate notification types for better UX
4. **Message Length**: Keep titles short, messages concise
5. **Cleanup**: Consider archiving old notifications (add cron job)

## 🐛 Troubleshooting

### Notifications Not Showing
- Check database migration ran successfully
- Verify user session is authenticated
- Check browser console for API errors
- Ensure notifications were sent to correct user_id

### Admin Can't Send
- Verify user has admin or manager role
- Check API route authentication
- Review browser console for errors

### Unread Count Wrong
- Refresh page
- Check `notification_recipients` table for correct user_id
- Verify RPC function is working

## 📚 Related Files

- `notification-schema.sql` - Database schema
- `FCM-SETUP.md` - Firebase Cloud Messaging setup
- `lib/types.ts` - TypeScript types
- `app/api/notifications/route.ts` - User API
- `app/api/admin/notifications/route.ts` - Admin API
- `app/admin/notifications/page.tsx` - Admin UI
- `components/NotificationsList.tsx` - User component
- `app/dashboard/page.tsx` - Dashboard integration
- `app/admin/layout.tsx` - Admin navigation
