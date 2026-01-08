'use client'

import { useEffect, useState } from 'react'
import { WorkLocationWithAreas } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function LocationsPage() {
  const [locations, setLocations] = useState<WorkLocationWithAreas[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAreasModal, setShowAreasModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<WorkLocationWithAreas | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
  })
  const [areaFormData, setAreaFormData] = useState({
    name: '',
    description: '',
    duration_minutes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [areaMessage, setAreaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations')
      const result = await response.json()
      setLocations(result.data || [])
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius_meters: formData.radius_meters,
        }),
      })

      if (response.ok) {
        setShowModal(false)
        fetchLocations()
        setFormData({
          name: '',
          latitude: '',
          longitude: '',
          radius_meters: 100,
        })
      }
    } catch (error) {
      console.error('Failed to create location:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (location: WorkLocationWithAreas) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius_meters: location.radius_meters,
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius_meters: formData.radius_meters,
        }),
      })

      if (response.ok) {
        setShowEditModal(false)
        setSelectedLocation(null)
        fetchLocations()
        setFormData({
          name: '',
          latitude: '',
          longitude: '',
          radius_meters: 100,
        })
      }
    } catch (error) {
      console.error('Failed to update location:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleManageAreas = (location: WorkLocationWithAreas) => {
    setSelectedLocation(location)
    setShowAreasModal(true)
  }

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation) return

    setSubmitting(true)
    setAreaMessage(null)
    try {
      const response = await fetch('/api/admin/office-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocation.id,
          name: areaFormData.name,
          description: areaFormData.description || null,
          duration_minutes: areaFormData.duration_minutes ? parseInt(areaFormData.duration_minutes) : null,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setAreaFormData({ name: '', description: '', duration_minutes: '' })
        setAreaMessage({ type: 'success', text: 'Area added successfully!' })
        
        // Refresh locations and update selected location
        const locResponse = await fetch('/api/admin/locations')
        const locResult = await locResponse.json()
        setLocations(locResult.data || [])
        
        // Update selected location with new data
        const updatedLocation = locResult.data?.find((loc: WorkLocationWithAreas) => loc.id === selectedLocation.id)
        if (updatedLocation) {
          setSelectedLocation(updatedLocation)
        }
        
        setTimeout(() => setAreaMessage(null), 3000)
      } else {
        setAreaMessage({ 
          type: 'error', 
          text: result.error?.message || result.error || 'Failed to add area. Make sure the office_areas table exists in your database.' 
        })
      }
    } catch (error) {
      console.error('Failed to add area:', error)
      setAreaMessage({ 
        type: 'error', 
        text: 'Network error. Please check your connection and ensure the database migration has been run.' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this area?')) return

    try {
      await fetch(`/api/admin/office-areas/${areaId}`, {
        method: 'DELETE',
      })
      fetchLocations()
    } catch (error) {
      console.error('Failed to delete area:', error)
    }
  }

  const handleToggleArea = async (areaId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/office-areas/${areaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      fetchLocations()
    } catch (error) {
      console.error('Failed to toggle area:', error)
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      
      fetchLocations()
    } catch (error) {
      console.error('Failed to toggle location:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      await fetch(`/api/admin/locations/${id}`, {
        method: 'DELETE',
      })
      
      fetchLocations()
    } catch (error) {
      console.error('Failed to delete location:', error)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          })
        },
        (error) => {
          alert('Failed to get location: ' + error.message)
        }
      )
    } else {
      alert('Geolocation is not supported by this browser')
    }
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentLocations = locations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(locations.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading locations...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Work Locations</h1>
          <p className="text-muted-foreground mt-1">Manage allowed check-in locations</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          + Add Location
        </Button>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {currentLocations.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No locations configured yet
            </CardContent>
          </Card>
        ) : (
          currentLocations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </CardDescription>
                  </div>
                  <Badge variant={location.is_active ? 'default' : 'secondary'}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Allowed Radius</p>
                  <p className="font-medium">{location.radius_meters}m</p>
                </div>
                {location.office_areas && location.office_areas.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Office Areas ({location.office_areas.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {location.office_areas.slice(0, 3).map((area) => (
                        <Badge key={area.id} variant="outline" className="text-xs">
                          {area.name}
                        </Badge>
                      ))}
                      {location.office_areas.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{location.office_areas.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleEdit(location)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleManageAreas(location)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Areas
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleToggle(location.id, location.is_active)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {location.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    onClick={() => handleDelete(location.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location Name</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Radius</TableHead>
              <TableHead>Office Areas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No locations configured yet
                </TableCell>
              </TableRow>
            ) : (
              currentLocations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </TableCell>
                  <TableCell>{location.radius_meters}m</TableCell>
                  <TableCell>
                    {location.office_areas && location.office_areas.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {location.office_areas.slice(0, 2).map((area) => (
                          <Badge key={area.id} variant="outline" className="text-xs">
                            {area.name}
                          </Badge>
                        ))}
                        {location.office_areas.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{location.office_areas.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.is_active ? 'default' : 'secondary'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(location)}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleManageAreas(location)}
                        variant="ghost"
                        size="sm"
                      >
                        Areas
                      </Button>
                      <Button
                        onClick={() => handleToggle(location.id, location.is_active)}
                        variant="ghost"
                        size="sm"
                      >
                        {location.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        onClick={() => handleDelete(location.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, locations.length)} of {locations.length} locations
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Configure a new check-in location for employees
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Main Office"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="0.000000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="0.000000"
                  required
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={getCurrentLocation}
              variant="outline"
              className="w-full"
            >
              📍 Use Current Location
            </Button>

            <div className="space-y-2">
              <Label htmlFor="radius">Allowed Radius (meters) *</Label>
              <Input
                id="radius"
                type="number"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Employees must be within this radius to check in/out
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Creating...' : 'Create Location'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Location Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Location Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Main Office"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-latitude">Latitude *</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="0.000000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-longitude">Longitude *</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="0.000000"
                  required
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={getCurrentLocation}
              variant="outline"
              className="w-full"
            >
              📍 Use Current Location
            </Button>

            <div className="space-y-2">
              <Label htmlFor="edit-radius">Allowed Radius (meters) *</Label>
              <Input
                id="edit-radius"
                type="number"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Employees must be within this radius to check in/out
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Updating...' : 'Update Location'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedLocation(null)
                  setFormData({
                    name: '',
                    latitude: '',
                    longitude: '',
                    radius_meters: 100,
                  })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Office Areas Modal */}
      <Dialog open={showAreasModal} onOpenChange={setShowAreasModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Office Areas - {selectedLocation?.name}</DialogTitle>
            <DialogDescription>
              Add and manage office areas/zones for this location
            </DialogDescription>
          </DialogHeader>

          {/* Add New Area Form */}
          <form onSubmit={handleAddArea} className="space-y-4 border-b pb-4">
            {areaMessage && (
              <div className={`p-3 rounded-md text-sm ${areaMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {areaMessage.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area-name">Area Name *</Label>
                <Input
                  id="area-name"
                  value={areaFormData.name}
                  onChange={(e) => setAreaFormData({ ...areaFormData, name: e.target.value })}
                  placeholder="e.g., Reception, Floor 1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area-description">Description</Label>
                <Input
                  id="area-description"
                  value={areaFormData.description}
                  onChange={(e) => setAreaFormData({ ...areaFormData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area-duration">Duration (minutes)</Label>
                <Input
                  id="area-duration"
                  type="number"
                  min="1"
                  value={areaFormData.duration_minutes}
                  onChange={(e) => setAreaFormData({ ...areaFormData, duration_minutes: e.target.value })}
                  placeholder="Guideline time"
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting} size="sm">
              {submitting ? 'Adding...' : '+ Add Area'}
            </Button>
          </form>

          {/* Existing Areas List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Existing Areas ({selectedLocation?.office_areas?.length || 0})</h4>
            {selectedLocation?.office_areas && selectedLocation.office_areas.length > 0 ? (
              <div className="space-y-2">
                {selectedLocation.office_areas.map((area) => (
                  <Card key={area.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{area.name}</h5>
                          <Badge variant={area.is_active ? 'default' : 'secondary'} className="text-xs">
                            {area.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {area.duration_minutes && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              ~{area.duration_minutes} min
                            </span>
                          )}
                        </div>
                        {area.description && (
                          <p className="text-sm text-muted-foreground">{area.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleToggleArea(area.id, area.is_active)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                        >
                          {area.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteArea(area.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No office areas added yet. Add your first area above.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={() => {
                setShowAreasModal(false)
                setSelectedLocation(null)
                setAreaFormData({ name: '', description: '', duration_minutes: '' })
              }}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
