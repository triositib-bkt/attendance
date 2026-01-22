# Notification Feature - Quick Start

## ✅ What Was Built

A complete notification system that allows back office (admin/manager) to send notifications to specific users or broadcast to all users. Notifications can be viewed in the dashboard.

## 🚀 Quick Setup (3 Steps)

### 1. Run Database Migration
In Supabase SQL Editor, run:
```sql
-- Copy and paste the entire content of notification-schema.sql
```

### 2. Access Admin Panel
Navigate to: `http://localhost:3000/admin/notifications`

### 3. Test It!
1. Click "Send Notification"
2. Fill in title and message
3. Choose "Broadcast to all active users" or select specific users
4. Click "Send Notification"
5. Check `/dashboard` to see the notification

## 📱 Where to Find Things

### Admin Side
- **Send Notifications**: `/admin/notifications`
- **View History**: Same page, table below the send button

### User Side  
- **Desktop**: `/dashboard` - Scroll down to Notifications section
- **Mobile**: `/dashboard` - Tap the bell icon (🔔) in bottom navigation

## 🎯 Key Features

✅ **Send to specific users** - Select individual employees  
✅ **Broadcast to all** - One-click to notify everyone  
✅ **5 Notification types** - Info, Success, Warning, Error, Announcement  
✅ **Read/Unread tracking** - See what's been read  
✅ **Mark as read** - Individual or all at once  
✅ **Responsive design** - Works on mobile and desktop  
✅ **FCM Ready** - Can add push notifications later (optional)

## 📝 Example Usage

### Morning Announcement
```
Title: Good Morning Team! ☀️
Message: Don't forget to check in when you arrive. Have a great day!
Type: Info
Broadcast: Yes
```

### Schedule Change
```
Title: Schedule Update
Message: Your shift for tomorrow has been changed to 9 AM - 5 PM
Type: Warning
Broadcast: No
Recipients: Select specific employees
```

### System Alert
```
Title: System Maintenance Tonight
Message: The system will be under maintenance from 10 PM to 12 AM
Type: Announcement
Broadcast: Yes
```

## 🔧 Current Status

**Working Now (No Extra Setup)**:
- ✅ Database storage
- ✅ Admin send interface
- ✅ User notification list
- ✅ Read/unread tracking
- ✅ Mobile & desktop views

**Optional (Requires Firebase Setup)**:
- ⏳ Push notifications (FCM)
- See `FCM-SETUP.md` for instructions

## 📚 Full Documentation

- **Complete Guide**: `NOTIFICATION-FEATURE.md`
- **FCM Setup**: `FCM-SETUP.md`
- **Database Schema**: `notification-schema.sql`

## 🐛 Troubleshooting

**Can't see notifications?**
- Check if migration ran successfully
- Verify you're logged in
- Make sure notification was sent to your user

**Can't send as admin?**
- Verify your role is 'admin' or 'manager'
- Check browser console for errors

**Mobile nav missing?**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

## 💡 Pro Tips

1. Use **Info** for general updates
2. Use **Warning** for schedule changes
3. Use **Announcement** for company-wide news
4. Keep messages short and clear
5. Test with yourself first before broadcasting

---

**Need help?** Check the full documentation in `NOTIFICATION-FEATURE.md`
