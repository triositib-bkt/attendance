"# Attendance System - Deployment Guide

A comprehensive Next.js attendance tracking system with GPS verification, mobile app support, and admin dashboard.

## Features

### Mobile App (Employee Interface)
- ✅ Check-in/Check-out with GPS location
- ✅ Real-time working hours timer
- ✅ Attendance history with calendar view
- ✅ Personal profile information
- ✅ Monthly attendance summary
- ✅ PWA support for mobile installation

### Backend/Admin Panel
- ✅ Employee management (CRUD operations)
- ✅ Role-based access control (Admin, Manager, Employee)
- ✅ Real-time attendance monitoring
- ✅ Daily attendance reports
- ✅ Monthly analytics and statistics
- ✅ Work location management with GPS verification
- ✅ Dashboard with key metrics

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **Maps/GPS**: Browser Geolocation API

## Prerequisites

1. Node.js 18+ installed
2. Supabase account (free tier works)
3. Vercel account (free tier works)
4. Git installed

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready (2-3 minutes)
3. Go to SQL Editor in your Supabase dashboard
4. Copy the entire content from `supabase-schema.sql` file
5. Paste and run it in the SQL Editor
6. Go to Project Settings > API
7. Copy the following:
   - Project URL
   - anon/public key
   - service_role key (keep this secret!)

### 2. Local Development Setup

1. Navigate to the project directory:
```bash
cd attendance
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### 3. Create First Admin User

Since you need an admin to create employees, create your first admin user manually:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" and create a user with email/password
3. Copy the User ID
4. Go to SQL Editor and run:
```sql
UPDATE profiles 
SET role = 'admin', 
    full_name = 'Admin Name',
    employee_id = 'ADMIN001'
WHERE id = 'paste-user-id-here';
```

### 4. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure Environment Variables:
   - Add all variables from `.env.local`
6. Click "Deploy"

#### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

## Environment Variables

Required environment variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Mobile App Installation (PWA)

### For Users:

**Android (Chrome/Edge):**
1. Open the app in Chrome/Edge
2. Tap the menu (⋮) → "Add to Home screen"
3. Confirm installation

**iOS (Safari):**
1. Open the app in Safari
2. Tap Share button → "Add to Home Screen"
3. Confirm installation

## Testing the Application

### Test Admin Features:
1. Login as admin
2. Navigate to Employees → Add new employee
3. Check Dashboard for statistics
4. View Attendance records
5. Generate Reports
6. Add Work Locations

### Test Employee Features:
1. Login as employee
2. Click "Check In" (ensure GPS is enabled)
3. View working time counter
4. Click "Check Out"
5. View attendance history

## API Endpoints

### Public Endpoints:
- `POST /api/attendance` - Check-in/out
- `GET /api/attendance` - Get current status
- `GET /api/attendance/history` - Get history

### Admin Endpoints:
- `GET/POST /api/admin/employees` - Employee management
- `GET/PUT/DELETE /api/admin/employees/[id]` - Employee details
- `GET /api/admin/attendance` - All attendance
- `GET /api/admin/reports` - Analytics
- `GET/POST /api/admin/locations` - Work locations
- `GET/PUT/DELETE /api/admin/locations/[id]` - Location details

## Database Schema

See `supabase-schema.sql` for complete schema including:
- Tables: profiles, attendance, work_locations
- Indexes for performance
- RLS policies for security
- Helper functions and triggers

## Quick Start Checklist

- [ ] Create Supabase project
- [ ] Run database schema
- [ ] Create `.env.local` with credentials
- [ ] Run `npm install`
- [ ] Create first admin user
- [ ] Test locally with `npm run dev`
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Add environment variables in Vercel
- [ ] Test production deployment
- [ ] Done! 🎉" 
