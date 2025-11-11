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

export function VibeLocalPage() {
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [locationError, setLocationError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [searchRadius, setSearchRadius] = useState(5000) // Raio padrão: 5km
  const [showChangeLocation, setShowChangeLocation] = useState(false)
  const requestedOnceRef = useRef(false)
  const isMountedRef = useRef(true)
  const isRequestingRef = useRef(false) // Prevenir chamadas simultâneas
  const sheetOpenRef = useRef(false) // Prevenir fechamento imediato do Sheet

  // Solicitar localização do usuário
  const requestLocation = useCallback(() => {
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

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocalização não é suportada pelo seu navegador'
      setLocationError(errorMsg)
      setIsRequestingLocation(false)
      isRequestingRef.current = false
      toast.error('Geolocalização não suportada', { description: errorMsg })
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        if (!isMountedRef.current) {
          isRequestingRef.current = false
          return
        }
        console.info('[VibeLocalPage] geolocation success', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setIsRequestingLocation(false)
        setLocationError(null)
        setErrorCode(null)
        requestedOnceRef.current = true // Marcar como bem-sucedido apenas após sucesso
        isRequestingRef.current = false
        
        // Os locais serão carregados automaticamente pelo LocationSwipe
        toast.success('Localização obtida!', { description: 'Buscando locais próximos...' })
      },
      error => {
        if (!isMountedRef.current) {
          isRequestingRef.current = false
          return
        }
        let errorMessage = 'Erro ao obter localização'
        let errorTitle = 'Erro de localização'
        
        // Códigos de erro da Geolocation API:
        // 1 = PERMISSION_DENIED
        // 2 = POSITION_UNAVAILABLE
        // 3 = TIMEOUT
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Permissão de localização negada. Por favor, permita o acesso à localização nas configurações do navegador.'
            errorTitle = 'Permissão negada'
            break
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Localização não disponível. Verifique se o GPS está ativado e tente novamente.'
            errorTitle = 'Localização indisponível'
            break
          case 3: // TIMEOUT
            errorMessage = 'Tempo esgotado ao obter localização. Verifique sua conexão e tente novamente.'
            errorTitle = 'Tempo esgotado'
            break
          default:
            errorMessage = `Erro ao obter localização: ${error.message || 'Erro desconhecido'}`
        }
        
        setLocationError(errorMessage)
        setErrorCode(error.code)
        setIsRequestingLocation(false)
        // Não marcar como requested para permitir nova tentativa
        requestedOnceRef.current = false
        isRequestingRef.current = false
        toast.error(errorTitle, { 
          description: errorMessage,
          duration: 5000,
        })
        // Log apenas como info quando há alternativa manual (permissão negada)
        if (error.code === 1) {
          console.info('[VibeLocalPage] geolocation permission denied - showing manual input', { 
            code: error.code, 
            message: error.message,
            userMessage: errorMessage 
          })
        } else {
          console.error('[VibeLocalPage] geolocation error', { 
            code: error.code, 
            message: error.message,
            userMessage: errorMessage 
          })
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Aumentar timeout para 15 segundos
        maximumAge: 60000, // Aceitar localização com até 1 minuto de idade
      }
    )
  }, [])

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
        setLatitude(result.data.lat)
        setLongitude(result.data.lng)
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
    if (requestedOnceRef.current || (latitude && longitude)) {
      console.info('[VibeLocalPage] mount skipped (already requested or has location)', {
        requestedOnce: requestedOnceRef.current,
        hasLatitude: !!latitude,
        hasLongitude: !!longitude
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
      setLatitude(place.geometry.lat)
      setLongitude(place.geometry.lng)
      setShowChangeLocation(false)
      toast.success('Localização alterada!', {
        description: `Buscando locais próximos a ${place.name || place.formatted_address}...`,
      })
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center relative">
          <h1 className="text-4xl font-bold mb-2">
            Vibe <span className="text-primary">Local</span>
          </h1>
          <p className="text-muted-foreground">
            Descubra os melhores locais da noite perto de você
          </p>

          {/* Botão discreto para mudar localização - posicionado no canto superior direito */}
          {latitude && longitude && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Mudar localização de busca"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                sheetOpenRef.current = true
                setShowChangeLocation(true)
                // Resetar o ref após um pequeno delay para permitir fechamento normal
                setTimeout(() => {
                  sheetOpenRef.current = false
                }, 300)
              }}
            >
              <MapPinned className="h-4 w-4" />
            </Button>
          )}
          
          {/* Sheet sempre renderizado para evitar problemas de montagem/desmontagem */}
          <Sheet 
            open={showChangeLocation} 
            onOpenChange={(open) => {
              // Permitir fechamento apenas se não estiver sendo aberto
              if (open) {
                sheetOpenRef.current = true
              }
              setShowChangeLocation(open)
            }}
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
              {latitude && longitude ? (
                <div className="mt-6 space-y-4">
                  {/* Opção 1: Buscar por lugar */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Buscar por lugar</h3>
                    <PlaceSearch
                      latitude={latitude}
                      longitude={longitude}
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
        {latitude && longitude && (
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
        )}

        {/* LocationSwipe - Os locais são carregados automaticamente quando há localização */}
        {latitude && longitude ? (
          <LocationSwipe latitude={latitude} longitude={longitude} radius={searchRadius} />
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Conteúdo de solicitação de localização */}
            <div className="space-y-4">
              {/* Mostrar GeolocationHandler quando erro é PERMISSION_DENIED (código 1) */}
              {errorCode === 1 ? (
                <GeolocationHandler
                  onSubmitManual={handleManualSearch}
                  onRetry={requestLocation}
                />
              ) : (
                <>
                  {locationError && errorCode !== 1 && (
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

