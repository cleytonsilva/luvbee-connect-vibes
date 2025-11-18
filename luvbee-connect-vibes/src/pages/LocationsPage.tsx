import { useState } from 'react'
import { LocationList } from '../components/location/LocationList'
import { LocationDetail } from './LocationDetailPage'
import { MapPin, List, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function LocationsPage() {
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
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Meus Locais Favoritos</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Locais que você curtiu na Vibe Local. Explore pessoas que também gostaram desses lugares!
        </p>
      </div>

      <LocationList 
        onLocationSelect={handleLocationSelect}
      />
    </div>
  )
}
