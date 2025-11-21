import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LATAM_COUNTRIES,
  getStatesByCountry,
  getCitiesByState,
  type Country,
  type State,
  type City
} from '@/lib/location-data'

interface LocationSelectProps {
  country?: string
  state?: string
  city?: string
  onCountryChange?: (country: string) => void
  onStateChange?: (state: string) => void
  onCityChange?: (city: string) => void
  countryLabel?: string
  stateLabel?: string
  cityLabel?: string
}

export function LocationSelect({
  country = '',
  state = '',
  city = '',
  onCountryChange,
  onStateChange,
  onCityChange,
  countryLabel = 'País',
  stateLabel = 'Estado',
  cityLabel = 'Cidade'
}: LocationSelectProps) {
  const [selectedCountry, setSelectedCountry] = useState(country)
  const [selectedState, setSelectedState] = useState(state)
  const [selectedCity, setSelectedCity] = useState(city)
  const [availableStates, setAvailableStates] = useState<State[]>([])
  const [availableCities, setAvailableCities] = useState<City[]>([])

  // Atualizar estados quando país mudar
  useEffect(() => {
    if (selectedCountry) {
      const states = getStatesByCountry(selectedCountry)
      setAvailableStates(states)
      // Limpar estado e cidade quando país mudar
      if (selectedCountry !== country) {
        setSelectedState('')
        setSelectedCity('')
        onStateChange?.('')
        onCityChange?.('')
      }
    } else {
      setAvailableStates([])
      setSelectedState('')
      setSelectedCity('')
    }
  }, [selectedCountry, country, onStateChange, onCityChange])

  // Atualizar cidades quando estado mudar
  useEffect(() => {
    if (selectedCountry && selectedState) {
      const cities = getCitiesByState(selectedCountry, selectedState)
      setAvailableCities(cities)
      // Limpar cidade quando estado mudar
      if (selectedState !== state) {
        setSelectedCity('')
        onCityChange?.('')
      }
    } else {
      setAvailableCities([])
      setSelectedCity('')
    }
  }, [selectedCountry, selectedState, state, onCityChange])

  // Sincronizar com props externas
  useEffect(() => {
    setSelectedCountry(country)
  }, [country])

  useEffect(() => {
    setSelectedState(state)
  }, [state])

  useEffect(() => {
    setSelectedCity(city)
  }, [city])

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value)
    onCountryChange?.(value)
  }

  const handleStateChange = (value: string) => {
    setSelectedState(value)
    onStateChange?.(value)
  }

  const handleCityChange = (value: string) => {
    setSelectedCity(value)
    onCityChange?.(value)
  }

  return (
    <div className="space-y-4 w-full">
      {/* País */}
      <div className="w-full">
        <Label htmlFor="country-select">{countryLabel}</Label>
        <Select value={selectedCountry} onValueChange={handleCountryChange}>
          <SelectTrigger id="country-select" className="w-full">
            <SelectValue placeholder="Selecione o país" />
          </SelectTrigger>
          <SelectContent>
            {LATAM_COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estado */}
      {selectedCountry && availableStates.length > 0 && (
        <div className="w-full">
          <Label htmlFor="state-select">{stateLabel}</Label>
          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger id="state-select" className="w-full">
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cidade */}
      {selectedState && (
        <div className="w-full">
          <Label htmlFor="city-select">{cityLabel}</Label>
          {availableCities.length > 0 ? (
            <Select value={selectedCity} onValueChange={handleCityChange}>
              <SelectTrigger id="city-select" className="w-full">
                <SelectValue placeholder="Selecione a cidade" />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((city, index) => (
                  <SelectItem key={`${city.name}-${index}`} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
              Cidades não disponíveis para este estado. Por favor, digite manualmente.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LocationSelect

