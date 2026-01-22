# Production Push Notification Troubleshooting

## Issue: Notifications work in development but not in production (Vercel)

## Checklist to Debug:

### ✅ Step 1: Check Vercel Environment Variables
Go to Vercel Dashboard → Settings → Environment Variables

Verify ALL these are set for **Production**:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
NEXT_PUBLIC_ENABLE_FCM=true

FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY (with \n characters preserved)
```

### ✅ Step 2: Check Firebase Authorized Domains
1. Go to Firebase Console → Authentication → Settings
2. Under "Authorized domains", add:
   - Your Vercel domain (e.g., `your-app.vercel.app`)
   - Any custom domains

### ✅ Step 3: Check Browser Console (Production)
1. Open your production site
2. Open DevTools (F12) → Console tab
3. Click "Enable" on notification banner
4. Look for these logs:
   ```
   🔔 Requesting FCM token...
   🔔 FCM Token result: Success or Failed
   🔔 Registering token with backend...
   🔔 Token registration result: {...}
   ```

### ✅ Step 4: Check Vercel Function Logs
1. Go to Vercel Dashboard → Deployments → Your latest deployment
2. Click on "Functions" tab
3. Send a test notification
4. Look for these logs:
   ```
   [FCM] Attempting to send to X devices
   [FCM] Result: X success, X failed
   ```

### ✅ Step 5: Verify Token is Registered
1. Open your production site
2. Open DevTools → Console
3. Run this command:
   ```javascript
   fetch('/api/notifications/fcm-token').then(r=>r.json()).then(console.log)
   ```
4. You should see your FCM token in the database

### ✅ Step 6: Check Service Worker (Production)
1. DevTools → Application → Service Workers
2. Verify `firebase-messaging-sw.js` is registered and "activated"
3. If it shows "redundant" or "installing", clear site data and refresh

### ✅ Step 7: Test Push Notification
1. Go to Admin → Notifications (on production)
2. Send notification to yourself
3. Check Vercel function logs for:
   ```
   [FCM] Attempting to send to 1 devices
   Successfully sent 1 notifications
   ```

## Common Issues:

### Issue: "FCM Token result: Failed"
**Cause:** Firebase config not loaded or service worker failed
**Solution:** 
- Check all `NEXT_PUBLIC_FIREBASE_*` variables are in Vercel
- Redeploy after adding variables
- Clear browser cache and service workers

### Issue: "Firebase Admin credentials not configured"
**Cause:** Server-side Firebase variables missing
**Solution:**
- Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in Vercel
- Ensure `FIREBASE_PRIVATE_KEY` preserves `\n` characters
- In Vercel, paste the entire value including quotes

### Issue: Token registered but notification not received
**Cause:** Firebase domain not authorized
**Solution:**
- Add Vercel domain to Firebase Console → Authentication → Authorized domains
- Wait 1-2 minutes for Firebase to propagate changes

### Issue: "Successfully sent" but still not received
**Cause:** Browser blocking notifications
**Solution:**
- Check browser notification settings
- Ensure site has notification permission granted
- Try different browser to test

## Quick Test Commands (Production Console):

### Check if FCM is configured:
```javascript
console.log({
  apiKey: !!import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: !!import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  vapidKey: !!import.meta.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  enabled: import.meta.env.NEXT_PUBLIC_ENABLE_FCM
})
```

### Check registered tokens:
```javascript
fetch('/api/notifications/fcm-token').then(r=>r.json()).then(data => {
  console.log('Registered tokens:', data)
})
```

### Manually test notification:
```javascript
new Notification('Test', { body: 'If you see this, browser notifications work!' })
```

## What Should Work:

✅ In-app notifications (always work, even without FCM)
✅ Notification list in dashboard
✅ Unread count badge
✅ Real-time updates when app is open

## What Needs FCM:

🔔 Push notifications when app is closed
🔔 Background notifications
🔔 Notifications when browser tab is not active

---

## After Following This Guide:

If still not working, check:
1. Vercel function logs for exact error messages
2. Browser console for client-side errors
3. Firebase Console → Cloud Messaging → Error logs

The added console.log statements will show exactly where the flow is breaking!
