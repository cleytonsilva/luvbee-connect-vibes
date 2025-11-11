/**
 * GeolocationHandler Component - Fallback para quando permissão de GPS é negada
 * Fornece busca manual por cidade/estado como alternativa
 * Salva automaticamente as informações quando o usuário altera os valores
 */

import { useState, useEffect, useRef } from 'react'
import { MapPinOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface GeolocationHandlerProps {
  onSubmitManual: (city: string, state: string) => void
  onRetry?: () => void
}

export function GeolocationHandler({ onSubmitManual, onRetry }: GeolocationHandlerProps) {
  const { user, profile, updateProfile } = useAuth()
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitializedRef = useRef(false)
  const hasLoadedFromProfileRef = useRef(false)
  const lastProcessedProfileIdRef = useRef<string | null>(null)

  // Carregar valores salvos quando o componente é montado
  useEffect(() => {
    // Só processar se o profile.id mudou ou se ainda não foi inicializado
    const currentProfileId = profile?.id || null
    if (hasInitializedRef.current && lastProcessedProfileIdRef.current === currentProfileId) {
      return // Já processou este perfil, não processar novamente
    }

    if (!(user || profile)) {
      return
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
    }
    
    // Tentar carregar do perfil primeiro
    if (profile?.location && currentProfileId !== lastProcessedProfileIdRef.current) {
      lastProcessedProfileIdRef.current = currentProfileId
      hasLoadedFromProfileRef.current = true
      
      let locationString = ''
      if (typeof profile.location === 'string') {
        locationString = profile.location
      } else if (typeof profile.location === 'object') {
        locationString = (profile.location as any).address || 
                        (profile.location as any).city || 
                        ''
      }
      
      // Extrair cidade e estado da string de localização
      if (locationString) {
        const parts = locationString.split(',').map(p => p.trim())
        if (parts.length >= 2) {
          setCity(parts[0])
          setState(parts[1].toUpperCase().substring(0, 2))
          return // Não continuar para localStorage se encontrou no perfil
        } else if (parts.length === 1) {
          setCity(parts[0])
          return
        }
      }
      
      // Tentar extrair diretamente do objeto location
      if (typeof profile.location === 'object' && profile.location !== null) {
        const loc = profile.location as any
        if (loc.city) {
          setCity(loc.city)
        }
        if (loc.state) {
          setState(loc.state.toUpperCase().substring(0, 2))
        }
        return // Não continuar para localStorage se encontrou no perfil
      }
    }
    
    // Fallback para localStorage apenas se não encontrou no perfil e ainda não inicializou
    if (!hasLoadedFromProfileRef.current && !lastProcessedProfileIdRef.current) {
      const savedCity = localStorage.getItem('luvbee_manual_city')
      const savedState = localStorage.getItem('luvbee_manual_state')
      
      if (savedCity) {
        setCity(savedCity)
      }
      if (savedState) {
        setState(savedState.toUpperCase())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.id]) // Usar apenas IDs para evitar loops

  // Salvar automaticamente quando cidade ou estado mudarem
  useEffect(() => {
    // Limpar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Não salvar se ainda não inicializou ou se os campos estão vazios
    // Não salvar durante o carregamento inicial (primeira vez que os valores são setados)
    if (!hasInitializedRef.current || (!city.trim() && !state.trim())) {
      return
    }

    // Aguardar um pouco após inicialização para permitir que valores sejam carregados
    // antes de começar a salvar automaticamente
    const initialDelay = hasLoadedFromProfileRef.current ? 0 : 2000 // 2 segundos se carregou do perfil, 0 se não

    // Debounce: salvar após 1 segundo sem mudanças
    saveTimeoutRef.current = setTimeout(async () => {
      if (!user) return

      try {
        // Salvar em localStorage como fallback
        if (city.trim()) {
          localStorage.setItem('luvbee_manual_city', city.trim())
        }
        if (state.trim()) {
          localStorage.setItem('luvbee_manual_state', state.trim().toUpperCase())
        }

        // Salvar no perfil do usuário
        const locationData = city.trim() && state.trim()
          ? {
              city: city.trim(),
              state: state.trim().toUpperCase(),
              address: `${city.trim()}, ${state.trim().toUpperCase()}, Brasil`,
              formatted_address: `${city.trim()}, ${state.trim().toUpperCase()}, Brasil`,
            }
          : city.trim()
            ? {
                city: city.trim(),
                address: city.trim(),
              }
            : null

        if (locationData) {
          await updateProfile({
            location: locationData,
          })
        }
      } catch (error) {
        console.warn('Erro ao salvar localização manual:', error)
        // Não mostrar toast para não incomodar o usuário durante digitação
      }
    }, 1000 + initialDelay) // 1 segundo de debounce + delay inicial

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, state, user?.id]) // Usar apenas user.id para evitar loops

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value)
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(e.target.value.toUpperCase())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city.trim() || !state.trim()) {
      return
    }
    setIsSubmitting(true)
    
    // Salvar antes de buscar
    try {
      const locationData = {
        city: city.trim(),
        state: state.trim().toUpperCase(),
        address: `${city.trim()}, ${state.trim().toUpperCase()}, Brasil`,
        formatted_address: `${city.trim()}, ${state.trim().toUpperCase()}, Brasil`,
      }

      await updateProfile({
        location: locationData,
      })

      // Salvar em localStorage também
      localStorage.setItem('luvbee_manual_city', city.trim())
      localStorage.setItem('luvbee_manual_state', state.trim().toUpperCase())
    } catch (error) {
      console.warn('Erro ao salvar localização:', error)
    }

    onSubmitManual(city.trim(), state.trim())
    // Reset após um delay para permitir feedback visual
    setTimeout(() => setIsSubmitting(false), 1000)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Ícone Location Off */}
      <div className="text-8xl mb-6">
        <MapPinOff className="w-24 h-24 text-muted-foreground mx-auto" strokeWidth={1.5} />
      </div>

      {/* Título */}
      <h2 className="font-display font-bold text-2xl mb-4">
        Oops! O LuvBee precisa da sua localização.
      </h2>

      {/* Texto de Instrução */}
      <p className="font-mono text-base text-muted-foreground mb-8 max-w-md">
        Parece que a permissão de GPS foi negada. Para encontrar 'vibes' automaticamente, você precisa ativá-la nas configurações do navegador.
      </p>

      {/* Botão de Recarregar (Opcional) */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="underline font-mono text-sm text-primary mb-6 hover:text-primary/80 transition-colors"
        >
          Recarregar após ativar
        </button>
      )}

      {/* Divisor */}
      <div className="font-display font-bold text-lg my-4 text-muted-foreground">OU</div>

      {/* Formulário de Fallback */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div className="space-y-4">
          {/* Input Cidade */}
          <input
            type="text"
            placeholder="Sua Cidade"
            value={city}
            onChange={handleCityChange}
            className="w-full font-mono border-b-4 border-foreground focus:border-primary bg-transparent px-2 py-3 text-lg outline-none transition-colors"
            required
          />

          {/* Input Estado */}
          <input
            type="text"
            placeholder="Estado (ex: SP)"
            value={state}
            onChange={handleStateChange}
            maxLength={2}
            className="w-full font-mono border-b-4 border-foreground focus:border-primary bg-transparent px-2 py-3 text-lg outline-none transition-colors uppercase"
            required
          />
        </div>

        {/* Botão de Ação */}
        <button
          type="submit"
          disabled={isSubmitting || !city.trim() || !state.trim()}
          className="w-full bg-primary text-background font-display font-bold py-4 border-4 border-foreground shadow-hard hover:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 transition-all"
        >
          {isSubmitting ? 'Buscando...' : 'Buscar Manualmente'}
        </button>
      </form>
    </div>
  )
}
