# Vercel Deployment Guide

## Pre-Deployment Checklist

### ✅ 1. Commit All Changes
```bash
git add .
git commit -m "Prepare for deployment"
git push
```

### ✅ 2. Environment Variables
Add these in Vercel Dashboard → Project Settings → Environment Variables:

#### **Supabase Configuration**
```
NEXT_PUBLIC_SUPABASE_URL=https://mflighnpzeqdyciqbuvu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_enXre1mLK9tGB7yhbP2LHw_pw_kr_G_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGlnaG5wemVxZHljaXFidXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc2NDQxOSwiZXhwIjoyMDgzMzQwNDE5fQ.IU5lBA52R796e7ut08FdmDdKn9ALRk-9Vfas2Zt3T80
```

#### **NextAuth Configuration**
```
NEXTAUTH_SECRET=OMz7u8dvo7vTw/zyAo2KmKCi7YU0kMyM6QsY9Zt1E+c=
NEXTAUTH_URL=https://YOUR-APP-NAME.vercel.app
```
⚠️ **IMPORTANT:** Replace `YOUR-APP-NAME` with your actual Vercel domain!

#### **Firebase Client (Public)**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCUvKoNm4KZ3xjN6T3zKpAhky-ZeU2osag
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=triositibattendance.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=triositibattendance
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=triositibattendance.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=741789180901
NEXT_PUBLIC_FIREBASE_APP_ID=1:741789180901:web:43aafb68d1365d9507050c
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-KTGE1QKSDS
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BKiPGbcpIjvH_ma-avwOIl3BQgPRjzcM1oZkH3TpcspYSd_IGrzdIoApQgfsnIKLJY8wl--bsrhYYYgWLV2ifIs
NEXT_PUBLIC_ENABLE_FCM=true
```

#### **Firebase Admin (Server-side)**
```
FIREBASE_PROJECT_ID=triositibattendance
FIREBASE_CLIENT_EMAIL=YOUR_SERVICE_ACCOUNT_EMAIL@triositibattendance.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### ✅ 3. Firebase Authorized Domains
1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain to "Authorized domains":
   - `your-app-name.vercel.app`
   - `your-custom-domain.com` (if using custom domain)

### ✅ 4. Update NEXTAUTH_URL After First Deploy
After your first deployment:
1. Get your Vercel URL (e.g., `https://attendance-xyz.vercel.app`)
2. Update `NEXTAUTH_URL` in Vercel environment variables
3. Redeploy

## Deployment Steps

### Option 1: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js
5. Add environment variables (see above)
6. Click "Deploy"

## Post-Deployment Checklist

### ✅ 1. Test Authentication
- Visit `/login`
- Try logging in with admin account
- Verify session works

### ✅ 2. Test Database Connection
- Check that dashboard loads data
- Verify attendance records work
- Test job checklists

### ✅ 3. Test Notifications
- Send a test notification from admin panel
- Verify it appears in user's notification list
- Test push notifications (if FCM enabled)

### ✅ 4. Check Service Workers
- Open DevTools → Application → Service Workers
- Verify firebase-messaging-sw.js is registered
- Check for any errors

### ✅ 5. Mobile Testing
- Test on mobile devices
- Verify responsive design works
- Test PWA installation

## Common Issues & Solutions

### Issue: 401 Unauthorized on API routes
**Solution:** Check that `NEXTAUTH_URL` matches your Vercel domain exactly

### Issue: Database connection fails
**Solution:** Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

### Issue: Push notifications don't work
**Solution:** 
1. Verify `FIREBASE_PRIVATE_KEY` is properly formatted (keep the \n)
2. Check Firebase authorized domains
3. Ensure HTTPS is enabled (Vercel provides this automatically)

### Issue: Build fails
**Solution:** Check build logs in Vercel dashboard. Common causes:
- Missing environment variables
- TypeScript errors
- Missing dependencies

## Environment-Specific Settings

### Production
- Set `NEXT_PUBLIC_ENABLE_FCM=true`
- Use production Supabase URL
- Enable all security features

### Preview/Staging
- Can use same Supabase instance
- Different `NEXTAUTH_URL` for preview deployments
- Test features before production

## Security Notes

1. ⚠️ Never commit `.env.local` to git
2. 🔐 Keep `SUPABASE_SERVICE_ROLE_KEY` secret (bypasses RLS)
3. 🔐 Keep `FIREBASE_PRIVATE_KEY` secret
4. ✅ All environment variables are encrypted in Vercel
5. ✅ Use Vercel's automatic HTTPS

## Monitoring

After deployment, monitor:
- **Vercel Dashboard:** Check function logs for errors
- **Supabase Dashboard:** Monitor database usage
- **Firebase Console:** Check FCM delivery rates
- **Browser Console:** Check for client-side errors

## Continuous Deployment

Vercel automatically deploys when you push to your repository:
- `main` branch → Production
- Other branches → Preview deployments

To disable auto-deploy: Vercel Dashboard → Project Settings → Git → Disable

## Rollback

If something goes wrong:
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

## Custom Domain (Optional)

1. Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to custom domain
5. Add custom domain to Firebase authorized domains

---

## Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard
**Firebase Console:** https://console.firebase.google.com/
**Supabase Dashboard:** https://supabase.com/dashboard

**Support:**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Firebase Docs: https://firebase.google.com/docs
