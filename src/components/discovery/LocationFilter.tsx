/**
 * LocationFilter Component - LuvBee Core Platform
 * 
 * Componente para filtrar locais na tela de exploração
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter } from 'lucide-react'
import { useLocationCategories } from '@/hooks/useExploreLocations'
import type { LocationFilter } from '@/types/app.types'
import { cn } from '@/lib/utils'

interface LocationFilterProps {
  onFilterChange: (filter: LocationFilter) => void
  currentFilter?: LocationFilter
}

export function LocationFilter({ onFilterChange, currentFilter }: LocationFilterProps) {
  const { data: categories = [] } = useLocationCategories()
  const [searchQuery, setSearchQuery] = useState(currentFilter?.search || '')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(currentFilter?.category)
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onFilterChange({
      ...currentFilter,
      search: value || undefined,
    })
  }

  const handleCategorySelect = (category: string) => {
    const newCategory = selectedCategory === category ? undefined : category
    setSelectedCategory(newCategory)
    onFilterChange({
      ...currentFilter,
      category: newCategory,
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(undefined)
    onFilterChange({})
  }

  const hasActiveFilters = searchQuery || selectedCategory

  return (
    <Card className="p-4 shadow-hard border-2 border-foreground">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar locais..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 shadow-hard border-2 border-foreground"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => handleSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Categorias</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category: any) => (
              <Badge
                key={category.id || category.name}
                variant={selectedCategory === (category.id || category.name) ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer shadow-hard border-2 border-foreground",
                  selectedCategory === (category.id || category.name) && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleCategorySelect(category.id || category.name)}
              >
                {category.icon && <span className="mr-1">{category.icon}</span>}
                {category.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

