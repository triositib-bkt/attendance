# Supabase Database Schema

This file contains the SQL schema for the attendance system. Run these commands in your Supabase SQL Editor.

## 1. Create Enum Type for User Roles

```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
```

## 2. Create Tables

### Profiles Table (extends Supabase auth.users)

```sql
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'employee',
  department TEXT,
  position TEXT,
  employee_id TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id);
CREATE INDEX idx_profiles_role ON profiles(role);
```

### Attendance Records Table

```sql
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE,
  check_in_lat DECIMAL(10, 8),
  check_in_lng DECIMAL(11, 8),
  check_out_lat DECIMAL(10, 8),
  check_out_lng DECIMAL(11, 8),
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_check_in ON attendance(check_in);
CREATE INDEX idx_attendance_user_check_in ON attendance(user_id, check_in);
```

### Work Locations Table

```sql
CREATE TABLE work_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for active locations
CREATE INDEX idx_work_locations_active ON work_locations(is_active);
```

## 3. Enable Row Level Security (RLS)

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_locations ENABLE ROW LEVEL SECURITY;
```

## 4. Create RLS Policies

### Profiles Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins and managers can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Only admins can insert new profiles
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update profiles
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Attendance Policies

```sql
-- Users can view their own attendance
CREATE POLICY "Users can view own attendance" ON attendance
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins and managers can view all attendance
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can insert their own attendance
CREATE POLICY "Users can insert own attendance" ON attendance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own attendance
CREATE POLICY "Users can update own attendance" ON attendance
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### Work Locations Policies

```sql
-- Anyone authenticated can view active locations
CREATE POLICY "Anyone can view active locations" ON work_locations
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all locations
CREATE POLICY "Admins can manage locations" ON work_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 5. Create Helper Functions

### Function to automatically create profile on user signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Function to update updated_at timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Function to check if user is admin

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6. Insert Sample Data (Optional)

### Sample Admin User
```sql
-- Note: You need to create the auth user first through Supabase dashboard or API
-- Then insert the profile with admin role

-- Example after creating user:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

### Sample Work Location
```sql
INSERT INTO work_locations (name, latitude, longitude, radius_meters, is_active)
VALUES ('Main Office', 37.7749, -122.4194, 100, true);
```

## Database Relationships

```
auth.users (Supabase Auth)
    ↓ (one-to-one)
profiles
    ↓ (one-to-many)
attendance

work_locations (standalone, used for validation)
```

## Important Notes

1. **Authentication**: Uses Supabase built-in authentication
2. **RLS Security**: All tables have Row Level Security enabled
3. **Soft Deletes**: Employee records use `is_active` flag instead of hard deletes
4. **GPS Coordinates**: Stored as DECIMAL(10,8) for latitude and DECIMAL(11,8) for longitude
5. **Timestamps**: All use `TIMESTAMP WITH TIME ZONE` for proper timezone handling

## Backup and Restore

To backup your database:
```bash
# Through Supabase Dashboard:
# Project Settings -> Database -> Create Backup
```

## Migration Notes

If you need to make changes to the schema:
1. Always test in a development/staging environment first
2. Consider data migration scripts for existing data
3. Update API and frontend code accordingly
4. Run migrations during low-traffic periods
