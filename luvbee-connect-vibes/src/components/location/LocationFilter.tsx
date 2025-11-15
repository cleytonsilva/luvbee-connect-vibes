import { useState, useEffect } from 'react'
import { Search, Filter, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationService } from '../../services/location.service'
import type { LocationFilter } from '../../types/app.types'

interface LocationFilterProps {
  onFilterChange: (filter: LocationFilter) => void
  className?: string
}

export function LocationFilter({ onFilterChange, className = '' }: LocationFilterProps) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    const filter: LocationFilter = {
      search: search || undefined,
      categoryId: categoryId || undefined,
      isActive
    }
    onFilterChange(filter)
  }, [search, categoryId, isActive])

  const loadCategories = async () => {
    try {
      const result = await LocationService.getCategories()
      if (result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setCategoryId('')
    setIsActive(true)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filter Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryId || 'all'} onValueChange={(value) => setCategoryId(value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {isLoadingCategories ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={isActive.toString()} onValueChange={(value) => setIsActive(value === 'true')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active locations</SelectItem>
              <SelectItem value="false">All locations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Use current location</span>
          <Button variant="outline" size="sm" className="ml-auto">
            Enable
          </Button>
        </div>

        <Button 
          variant="outline" 
          onClick={handleClearFilters}
          className="w-full"
        >
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  )
}