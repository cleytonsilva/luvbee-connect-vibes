/**
 * VibeLocal Page - Core Loop 1: Descobrir e dar match com locais
 * T044: User Story 2 - Core Loop 1: Vibe Local
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { LocationSwipe } from '@/components/location/LocationSwipe'
import { PlaceSearch } from '@/components/location/PlaceSearch'
import { GeolocationHandler } from '@/components/GeolocationHandler'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MapPin, Loader2, MapPinned } from 'lucide-react'
import { toast } from 'sonner'
import { GooglePlacesService } from '@/services/google-places.service'
import { useVibeModeStore } from '@/store/useVibeMode'
import { useVibePlaces } from '@/hooks/useVibePlaces'
import { GeolocationService } from '@/services/geolocation.service'
import { useAuth } from '@/hooks/useAuth'
import { LocationService } from '@/services/location.service'
import { safeLog } from '@/lib/safe-log'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function VibeLocalPage() {
  const { profile, user } = useAuth()
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [manualCity, setManualCity] = useState<string | null>(null)
  const [manualState, setManualState] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [searchRadius, setSearchRadius] = useState(5000) // Raio padrão: 5km
  const [showChangeLocation, setShowChangeLocation] = useState(false)
  const requestedOnceRef = useRef(false)
  const isMountedRef = useRef(true)
  const isRequestingRef = useRef(false) // Prevenir chamadas simultâneas

  const { soloMode, setSoloMode } = useVibeModeStore()

  // Usar o novo hook para buscar lugares
  const {
    places,
    loading: placesLoading,
    error: placesError,
    refresh,
    hasMore,
    loadMore,
    cacheStatus
  } = useVibePlaces({
    userLocation: latitude && longitude ? { lat: latitude, lng: longitude } : null,
    manualCity,
    manualState,
    mode: soloMode ? 'solo' : 'normal',
    radius: searchRadius
  })

  // Monitoramento de mudanças de estado para debugging
  useEffect(() => {
    console.log('[VibeLocalPage] Estado atual:', {
      latitude,
      longitude,
      manualCity,
      manualState,
      placesCount: places.length,
      placesLoading,
      placesError,
      cacheStatus,
      soloMode
    })
  }, [latitude, longitude, manualCity, manualState, places.length, placesLoading, placesError, cacheStatus, soloMode])

  const tryLoadManualFromProfileOrStorage = useCallback(() => {
    // Já possui localização ativa
    if ((latitude && longitude) || (manualCity && manualState)) return false

    // Tentar extrair cidade/estado do perfil
    let cityFromProfile: string | null = null
    let stateFromProfile: string | null = null

    if (profile?.location) {
      if (typeof profile.location === 'string') {
        const parts = profile.location.split(',').map(p => p.trim())
        if (parts.length >= 2) {
          cityFromProfile = parts[0]
          stateFromProfile = parts[1].toUpperCase().substring(0, 2)
        } else if (parts.length === 1) {
          cityFromProfile = parts[0]
        }
      } else if (typeof profile.location === 'object' && profile.location !== null) {
        const loc = profile.location as any
        if (loc.city) cityFromProfile = String(loc.city)
        if (loc.state) stateFromProfile = String(loc.state).toUpperCase().substring(0, 2)
        if (!stateFromProfile && typeof loc.address === 'string') {
          const parts = loc.address.split(',').map((p: string) => p.trim())
          if (parts.length >= 2) stateFromProfile = parts[1].toUpperCase().substring(0, 2)
        }
      }
    }

    // Fallback para localStorage
    const cityFromStorage = localStorage.getItem('luvbee_manual_city')
    const stateFromStorage = localStorage.getItem('luvbee_manual_state')

    const finalCity = cityFromProfile || cityFromStorage || null
    const finalState = stateFromProfile || stateFromStorage || null

    if (finalCity && finalState) {
      setLatitude(undefined)
      setLongitude(undefined)
      setManualCity(finalCity)
      setManualState(finalState)
      requestedOnceRef.current = true
      setLocationError(null)
      setErrorCode(null)
      return true
    }

    return false
  }, [profile, latitude, longitude, manualCity, manualState])

  // Solicitar localização do usuário com mecanismo robusto
  const requestLocation = useCallback(async () => {
    // Prevenir chamadas simultâneas
    if (isRequestingRef.current) {
      console.info('[VibeLocalPage] requestLocation skipped (already requesting)')
      return
    }
    
    if (!isMountedRef.current) {
      console.info('[VibeLocalPage] requestLocation skipped (component unmounted)')
      return
    }
    
    console.info('[VibeLocalPage] requestLocation start')
    isRequestingRef.current = true
    setIsRequestingLocation(true)
    setLocationError(null)
    setErrorCode(null)

    try {
      // Usar o novo serviço robusto de geolocalização
      const location = await GeolocationService.getCurrentLocation({
        timeout: 15000,
        maximumAge: 60000,
        enableHighAccuracy: true,
        fallbackToIP: true
      })

      if (!isMountedRef.current) {
        isRequestingRef.current = false
        return
      }

      console.info('[VibeLocalPage] geolocation success', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        source: location.accuracy < 1000 ? 'GPS' : 'IP'
      })

      // Se a precisão for baixa (> 5km), preferir cidade/estado manual
      if (location.accuracy > 5000) {
        const applied = tryLoadManualFromProfileOrStorage()
        if (applied) {
          setIsRequestingLocation(false)
          setLocationError(null)
          setErrorCode(null)
          requestedOnceRef.current = true
          isRequestingRef.current = false
          toast.success('Usando localização do perfil', {
            description: 'GPS impreciso. Buscando locais pela sua cidade configurada...'
          })
        } else {
          // Sem cidade/estado disponível: usar coordenadas aproximadas mesmo assim
          setLatitude(location.latitude)
          setLongitude(location.longitude)
          setIsRequestingLocation(false)
          setLocationError(null)
          setErrorCode(null)
          requestedOnceRef.current = true
          isRequestingRef.current = false
          toast.success('Localização aproximada obtida', { 
            description: 'Buscando locais próximos com localização aproximada...'
          })
        }
      } else {
        // Precisão boa (GPS)
        setLatitude(location.latitude)
        setLongitude(location.longitude)
        setIsRequestingLocation(false)
        setLocationError(null)
        setErrorCode(null)
        requestedOnceRef.current = true
        isRequestingRef.current = false
        toast.success('Localização obtida!', { 
          description: 'Buscando locais próximos com GPS...'
        })
      }

    } catch (error: any) {
      if (!isMountedRef.current) {
        isRequestingRef.current = false
        return
      }

      let errorMessage = 'Erro ao obter localização'
      let errorTitle = 'Erro de localização'
      let errorCode = null

      // Verificar se é um erro do nosso serviço
      if (error.code && error.userMessage) {
        errorCode = error.code
        errorMessage = error.userMessage
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorTitle = 'Permissão negada'
            break
          case 2: // POSITION_UNAVAILABLE
            errorTitle = 'Localização indisponível'
            errorMessage = 'Não foi possível obter sua localização. Verifique sua conexão com a internet ou tente usar a busca manual por cidade.'
            break
          case 3: // TIMEOUT
            errorTitle = 'Tempo esgotado'
            errorMessage = 'A solicitação de localização demorou muito. Tente novamente ou use a busca manual.'
            break
          default:
            errorTitle = 'Erro de localização'
        }
      } else {
        errorMessage = error.message || 'Erro ao obter localização'
      }
      
      setLocationError(errorMessage)
      setErrorCode(errorCode)
      setIsRequestingLocation(false)
      requestedOnceRef.current = false
      isRequestingRef.current = false
      
      toast.error(errorTitle, { 
        description: errorMessage,
        duration: 5000,
      })

      // Fallback automático: usar localização do perfil/localStorage quando posição indisponível
      const appliedFallback = tryLoadManualFromProfileOrStorage()
      if (appliedFallback) {
        toast.success('Usando localização do perfil', {
          description: 'Buscando locais pela sua cidade configurada...',
        })
      }

      // Log apenas como info quando há alternativa manual (permissão negada)
      if (errorCode === 1) {
        console.info('[VibeLocalPage] geolocation permission denied - showing manual input', { 
          code: errorCode, 
          message: error.message,
          userMessage: errorMessage 
        })
      } else {
        console.error('[VibeLocalPage] geolocation error', { 
          code: errorCode, 
          message: error.message,
          userMessage: errorMessage 
        })
      }
    }
  }, [tryLoadManualFromProfileOrStorage])

  // Buscar localização manual por cidade/estado
  const handleManualSearch = useCallback(async (city: string, state: string) => {
    setIsRequestingLocation(true)
    setLocationError(null)
    
    try {
      const address = `${city}, ${state}, Brasil`
      const result = await GooglePlacesService.geocodeAddress(address)
      
      if (result.error) {
        setLocationError(result.error)
        toast.error('Erro ao buscar localização', { description: result.error })
        setIsRequestingLocation(false)
        return
      }
      
      if (result.data) {
        // Limpar localização GPS e usar cidade/estado manual
        setLatitude(undefined)
        setLongitude(undefined)
        setManualCity(city)
        setManualState(state)
        setLocationError(null)
        setErrorCode(null)
        requestedOnceRef.current = true
        setShowChangeLocation(false) // Fechar o sheet após mudar localização
        
        toast.success('Localização alterada!', { description: `Buscando locais em ${city}, ${state}...` })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao buscar localização'
      setLocationError(errorMsg)
      toast.error('Erro ao buscar localização', { description: errorMsg })
    } finally {
      setIsRequestingLocation(false)
    }
  }, [])

  // Tentar obter localização automaticamente ao carregar (apenas uma vez)
  useEffect(() => {
    isMountedRef.current = true
    
    // Verificar se já foi solicitado ou se já tem localização
    if (requestedOnceRef.current || (latitude && longitude) || (manualCity && manualState)) {
      console.info('[VibeLocalPage] mount skipped (already requested or has location)', {
        requestedOnce: requestedOnceRef.current,
        hasLatitude: !!latitude,
        hasLongitude: !!longitude,
        hasManualCity: !!manualCity,
        hasManualState: !!manualState
      })
      return
    }
    
    // Verificar se já está solicitando
    if (isRequestingRef.current) {
      console.info('[VibeLocalPage] mount skipped (already requesting)')
      return
    }
    
    console.info('[VibeLocalPage] mount → auto requestLocation')
    requestLocation()
    
    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executar apenas uma vez no mount

  // Quando perfil carregar, aplicar fallback automático se necessário
  useEffect(() => {
    if (!latitude && !longitude && !manualCity && !manualState) {
      const applied = tryLoadManualFromProfileOrStorage()
      if (applied) {
        console.info('[VibeLocalPage] applied manual location from profile/storage')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    if ((errorCode === 1 || errorCode === 2) && !latitude && !longitude && !manualCity && !manualState) {
      setShowChangeLocation(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorCode])

  // Opções de raio de busca
  const radiusOptions = [
    { label: 'Perto (5km)', value: 5000 },
    { label: 'Cidade (15km)', value: 15000 },
    { label: 'Região (30km)', value: 30000 },
  ]

  // Handler para mudar localização via PlaceSearch
  const handlePlaceSelect = useCallback((place: {
    place_id: string
    name?: string
    formatted_address?: string
    geometry?: {
      lat: number
      lng: number
    }
  }) => {
    if (place.geometry) {
      // Limpar cidade/estado manual e usar coordenadas
      setManualCity(null)
      setManualState(null)
      setLatitude(place.geometry.lat)
      setLongitude(place.geometry.lng)
      setShowChangeLocation(false)
      toast.success('Localização alterada!', {
        description: `Buscando locais próximos a ${place.name || place.formatted_address}...`,
      })
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 prevent-mobile-overflow">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              {/* Indicador de status do cache */}
              {!placesLoading && cacheStatus !== 'none' && (
                <div className={`text-xs px-2 py-1 rounded ${
                  cacheStatus === 'valid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {cacheStatus === 'valid' ? 'Cache válido' : 'Buscando novos lugares...'}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 order-1 sm:order-2">
              {/* Modo de localização */}
              {(latitude && longitude) || (manualCity && manualState) ? (
                <div className="location-status-badge bg-accent/20 text-foreground border">
                  {manualCity && manualState
                    ? `Modo manual: ${manualCity}, ${manualState}`
                    : 'Modo GPS'}
                </div>
              ) : null}
              
              {/* Botão para mudar localização */}
              {(latitude && longitude) || (manualCity && manualState) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0 touch-target-enhanced"
                  title="Mudar localização de busca"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    requestAnimationFrame(() => {
                      setShowChangeLocation(true)
                    })
                  }}
                >
                  <MapPinned className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Vibe <span className="text-primary">Local</span>
              </h1>
              <p className="text-muted-foreground">
                Descubra os melhores locais da noite perto de você
              </p>
            </div>
            
            {/* Toggle Modo Solo */}
            <div className="flex items-center gap-3 px-4 py-2 border-2 border-foreground rounded-md bg-background">
              <Label htmlFor="solo-mode" className="text-sm font-semibold cursor-pointer">
                Modo Solo
              </Label>
              <Switch
                id="solo-mode"
                checked={soloMode}
                onCheckedChange={(checked) => {
                  setSoloMode(checked)
                  // Re-executar busca quando toggle mudar
                  refresh()
                }}
              />
            </div>
          </div>
          
          {/* Sheet sempre renderizado para evitar problemas de montagem/desmontagem */}
          <Sheet 
            open={showChangeLocation} 
            onOpenChange={setShowChangeLocation}
          >
            <SheetContent 
              side="right" 
              className="w-full sm:max-w-md"
            >
              <SheetHeader>
                <SheetTitle>Mudar Localização de Busca</SheetTitle>
                <SheetDescription>
                  Escolha uma nova localização para buscar locais próximos
                </SheetDescription>
              </SheetHeader>
              {(latitude && longitude) || (manualCity && manualState) ? (
                <div className="mt-6 space-y-4">
                  {/* Opção 1: Buscar por lugar */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Buscar por lugar</h3>
                    <PlaceSearch
                      latitude={latitude || -23.5505} // São Paulo como fallback
                      longitude={longitude || -46.6333}
                      radius={searchRadius}
                      onPlaceSelect={handlePlaceSelect}
                    />
                  </div>

                  {/* Opção 2: Buscar manualmente por cidade/estado */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Ou informe cidade e estado</h3>
                    <GeolocationHandler
                      onSubmitManual={handleManualSearch}
                      onRetry={requestLocation}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center text-muted-foreground">
                  <p>Carregando localização...</p>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>

        {/* Controle de Raio de Busca - Mostrar apenas quando tem localização */}
        {(latitude && longitude) || (manualCity && manualState) ? (
          <div className="mb-6 flex justify-center gap-2">
            {radiusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSearchRadius(option.value)}
                className={`font-mono text-sm py-2 px-3 border-2 border-foreground transition-all ${
                  searchRadius === option.value
                    ? 'bg-primary text-background border-4 shadow-hard'
                    : 'bg-accent text-foreground hover:bg-accent/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* LocationSwipe - Os locais são carregados automaticamente pelo hook */}
        {(latitude && longitude) || (manualCity && manualState) ? (
          <div className="space-y-4">
            {/* Status de carregamento */}
            {placesLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                <span>Carregando locais...</span>
              </div>
            )}

            {/* Erro ao carregar lugares */}
            {placesError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p>{placesError}</p>
                  <Button onClick={refresh} className="mt-2" size="sm">
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Lista de lugares */}
            {!placesLoading && !placesError && places.length > 0 && (
              <LocationSwipe 
                places={places}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={placesLoading}
                onLike={async (loc) => {
                  if (!user?.id) return
                  const idOrPlace = (loc as any).place_id || (loc as any).id
                  safeLog('info', '[VibeLocalPage] onLike:start', { userId: user.id, idOrPlace })
                  await LocationService.createLocationMatch(user.id, String(idOrPlace))
                  safeLog('info', '[VibeLocalPage] onLike:done', { userId: user.id, idOrPlace })
                  await refresh()
                }}
                onDislike={async (loc) => {
                  if (!user?.id) return
                  const idOrPlace = (loc as any).place_id || (loc as any).id
                  safeLog('info', '[VibeLocalPage] onDislike:start', { userId: user.id, idOrPlace })
                  const result = await LocationService.removeLocationMatch(user.id, String(idOrPlace))
                  safeLog('info', '[VibeLocalPage] onDislike:result', { result })
                  await refresh()
                }}
              />
            )}

            {/* Nenhum lugar encontrado */}
            {!placesLoading && !placesError && places.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed rounded-xl">
                <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum local encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Não encontramos locais próximos a esta área. Tente:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-6">
                  <li>• Aumentar o raio de busca</li>
                  <li>• Mudar para outra localização</li>
                  <li>• Verificar se está no modo correto (Normal/Solo)</li>
                  <li>• Verificar sua conexão com a internet</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={refresh} size="sm">
                    Atualizar busca
                  </Button>
                  <Button 
                    onClick={() => setShowChangeLocation(true)} 
                    size="sm" 
                    variant="outline"
                  >
                    Mudar localização
                  </Button>
                </div>
                
                {/* Debug info para desenvolvimento */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-muted rounded text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Info de Debug:</p>
                    <p>Latitude: {latitude || 'N/A'}</p>
                    <p>Longitude: {longitude || 'N/A'}</p>
                    <p>Cidade: {manualCity || 'N/A'}</p>
                    <p>Estado: {manualState || 'N/A'}</p>
                    <p>Modo: {soloMode ? 'Solo' : 'Normal'}</p>
                    <p>Raio: {searchRadius}m</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Conteúdo de solicitação de localização */}
            <div className="space-y-4">
              {/* Mostrar GeolocationHandler quando erro é PERMISSION_DENIED (código 1) e não há localização */}
              {(errorCode === 1 || errorCode === 2) && !latitude && !longitude && !manualCity && !manualState ? (
                <GeolocationHandler
                  onSubmitManual={handleManualSearch}
                  onRetry={requestLocation}
                />
              ) : (
                <>
                  {locationError && errorCode !== 1 && !latitude && !longitude && !manualCity && !manualState && (
                    <Alert variant="destructive">
                      <AlertDescription className="space-y-2">
                        <p>{locationError}</p>
                        {locationError.includes('Permissão') && (
                          <div className="mt-3 text-sm space-y-1">
                            <p className="font-semibold">Como permitir a localização:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Clique no ícone de cadeado ou informações na barra de endereço</li>
                              <li>Selecione "Permitir" para localização</li>
                              <li>Ou ajuste nas configurações do navegador</li>
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!latitude && !longitude && !manualCity && !manualState && (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl">
                      <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        {isRequestingLocation ? 'Obtendo localização...' : 'Localização necessária'}
                      </h3>
                      <p className="text-muted-foreground mb-6 text-center max-w-md">
                        {isRequestingLocation
                          ? 'Por favor, permita o acesso à sua localização para encontrar locais próximos.'
                          : 'Precisamos da sua localização para mostrar os melhores locais perto de você.'}
                      </p>
                      {!isRequestingLocation && (
                        <Button onClick={requestLocation} size="lg" className="shadow-hard">
                          <MapPin className="w-4 h-4 mr-2" />
                          {locationError ? 'Tentar Novamente' : 'Permitir Localização'}
                        </Button>
                      )}
                      {isRequestingLocation && (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Aguardando permissão...</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
