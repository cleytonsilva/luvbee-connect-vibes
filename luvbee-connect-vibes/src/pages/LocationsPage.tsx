import { useState, useEffect } from 'react'
import { LocationList } from '../components/location/LocationList'
import { LocationFilter } from '../components/location/LocationFilter'
import { LocationDetail } from './LocationDetailPage'
import { LocationFilter as LocationFilterType } from '../types/app.types'
import { Card } from '@/components/ui/card'
import { MapPin, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LocationsPage() {
  const [filters, setFilters] = useState<LocationFilterType>({})
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setSelectedLocationId(null)
    setViewMode('list')
  }

  if (viewMode === 'detail' && selectedLocationId) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Location Details</h1>
            <p className="text-gray-600">Explore detailed information about this location</p>
          </div>
          <Button onClick={handleBackToList} variant="outline">
            <List className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
        
        <LocationDetail locationId={selectedLocationId} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <MapPin className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Discover Locations</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Find amazing places to connect with like-minded people and create meaningful experiences
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <LocationFilter onFilterChange={setFilters} />
          </Card>
        </div>
        
        <div className="lg:col-span-3">
          <LocationList 
            filter={filters} 
            onLocationSelect={handleLocationSelect}
          />
        </div>
      </div>
    </div>
  )
}
