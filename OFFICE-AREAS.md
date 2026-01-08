# Office Areas Feature

## Overview
Office areas is a new feature that allows administrators to define specific zones/areas within each work location. This is useful for:
- Job scheduling and task assignments
- Checklists specific to areas
- Better organization of work by physical location zones
- Future expansion for area-specific features

## Database Design
Instead of storing office areas as an array column in `work_locations`, we use a normalized relational table:

### Table: `office_areas`
- **id** (UUID): Primary key
- **location_id** (UUID): Foreign key to work_locations (CASCADE delete)
- **name** (VARCHAR): Area name (e.g., "Reception", "Floor 1")
- **description** (TEXT): Optional description
- **is_active** (BOOLEAN): Toggle area availability
- **created_at, updated_at** (TIMESTAMPTZ): Timestamps

### Relationships
- One work location can have many office areas
- Deleting a location automatically deletes its areas (CASCADE)
- Active/inactive toggle for flexible management

## Migration
To apply the database changes, run the SQL migration in Supabase:

```bash
# Copy the contents of add-office-areas.sql
# Paste and execute in Supabase SQL Editor
```

Or use the Supabase CLI:
```bash
supabase db push
```

## Features Implemented

### Admin UI (`/admin/locations`)
1. **View Areas**: Each location shows count and preview of office areas
2. **Manage Areas Button**: Opens modal for full area management
3. **Add Areas**: Form to create new areas with name and description
4. **Toggle Active/Inactive**: Enable/disable areas without deleting
5. **Delete Areas**: Remove areas with confirmation
6. **Responsive**: Works on mobile and desktop

### API Endpoints

#### Locations API (`/api/admin/locations`)
- **GET**: Fetch all locations with their office areas (joined query)
- **POST**: Create new location

#### Office Areas API (`/api/admin/office-areas`)
- **POST**: Create new office area
  ```json
  {
    "location_id": "uuid",
    "name": "Reception",
    "description": "Main entrance"
  }
  ```

#### Office Area by ID (`/api/admin/office-areas/[id]`)
- **PUT**: Update area (name, description, is_active)
- **DELETE**: Delete area

### TypeScript Types
```typescript
interface OfficeArea {
  id: string
  location_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface WorkLocationWithAreas extends WorkLocation {
  office_areas: OfficeArea[]
}
```

## Usage Example

1. Navigate to `/admin/locations`
2. Click "Manage Areas" on any location
3. Add areas like:
   - Reception
   - Office Floor 1
   - Office Floor 2
   - Meeting Rooms
   - Cafeteria
4. Toggle active/inactive as needed
5. Use these areas in future features (job schedules, checklists)

## Future Enhancements
- Assign employees to specific areas
- Create area-specific job schedules
- Area-based checklists and tasks
- Track which area employees check in from
- Area occupancy tracking

## Security
- Row Level Security (RLS) enabled
- All authenticated users can read areas
- Only admins can create/update/delete areas
- Automatic CASCADE delete when parent location is removed
