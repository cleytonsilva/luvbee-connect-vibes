/**
 * ExplorePage - User Story 5: Explorar Locais e Eventos
 * 
 * Página para explorar locais curados além do fluxo de swipe
 */

import { useState } from 'react'
import { LocationFilter } from '@/components/discovery/LocationFilter'
import { ExploreLocations } from '@/components/discovery/ExploreLocations'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Compass } from 'lucide-react'
import type { LocationFilter as LocationFilterType } from '@/types/app.types'
import { useNavigate } from 'react-router-dom'

export function ExplorePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<LocationFilterType>({})

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Card className="p-8 text-center">
          <Compass className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Você precisa estar logado
          </h3>
          <p className="text-muted-foreground mb-6">
            Faça login para explorar locais
          </p>
          <Button onClick={() => navigate('/auth')}>
            Fazer Login
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">
          Explorar Locais
        </h1>
        <p className="text-muted-foreground">
          Descubra novos lugares e eventos incríveis
        </p>
      </div>

      {/* Filters */}
      <LocationFilter
        onFilterChange={setFilter}
        currentFilter={filter}
      />

      {/* Locations Grid */}
      <ExploreLocations filter={filter} />
    </div>
  )
}

