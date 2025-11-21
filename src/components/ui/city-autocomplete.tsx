import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { GoogleMapsLoader } from '@/services/google-maps-loader.service'
import { safeLog } from '@/lib/safe-log'

interface CityOption {
  name: string
  country: string
  countryCode?: string
  region?: string
  state?: string
  placeId?: string
}

interface CityAutocompleteProps {
  id?: string
  label?: string
  value?: string
  countryFilter?: string | null
  onChange?: (value: string) => void
  onSelect?: (city: CityOption) => void
  placeholder?: string
}

const LATAM_COUNTRIES: { code: string; name: string }[] = [
  { code: 'BR', name: 'Brasil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'PY', name: 'Paraguai' },
  { code: 'BO', name: 'Bolívia' },
  { code: 'EC', name: 'Equador' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'HN', name: 'Honduras' },
  { code: 'NI', name: 'Nicarágua' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'CU', name: 'Cuba' },
  { code: 'PR', name: 'Porto Rico' }
]

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Função para obter sigla do estado brasileiro
function getStateAbbreviation(stateName: string): string {
  const stateMap: Record<string, string> = {
    'Acre': 'AC',
    'Alagoas': 'AL',
    'Amapá': 'AP',
    'Amazonas': 'AM',
    'Bahia': 'BA',
    'Ceará': 'CE',
    'Distrito Federal': 'DF',
    'Espírito Santo': 'ES',
    'Goiás': 'GO',
    'Maranhão': 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    'Pará': 'PA',
    'Paraíba': 'PB',
    'Paraná': 'PR',
    'Pernambuco': 'PE',
    'Piauí': 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    'Rondônia': 'RO',
    'Roraima': 'RR',
    'Santa Catarina': 'SC',
    'São Paulo': 'SP',
    'Sergipe': 'SE',
    'Tocantins': 'TO'
  }
  
  // Se já for uma sigla de 2 letras, retornar como está
  if (stateName.length === 2 && /^[A-Z]{2}$/.test(stateName.toUpperCase())) {
    return stateName.toUpperCase()
  }
  
  // Buscar no mapa
  const normalized = stateName.trim()
  return stateMap[normalized] || stateName
}

export function CityAutocomplete({
  id = 'city-autocomplete',
  label = 'Cidade',
  value = '',
  countryFilter = null,
  onChange,
  onSelect,
  placeholder = 'Digite sua cidade'
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(false)
  const [country, setCountry] = useState<string | null>(countryFilter)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const autocompleteSvcRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesSvcRef = useRef<google.maps.places.PlacesService | null>(null)
  const cacheRef = useRef<Map<string, CityOption[]>>(new Map())
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setQuery(value)
    if (!value) {
      const saved = localStorage.getItem('onboarding.city')
      const savedCountry = localStorage.getItem('onboarding.country')
      if (saved) setQuery(saved)
      if (savedCountry) setCountry(savedCountry)
    }
  }, [value])

  useEffect(() => {
    (async () => {
      try {
        await GoogleMapsLoader.load()
        autocompleteSvcRef.current = new google.maps.places.AutocompleteService()
        placesSvcRef.current = new google.maps.places.PlacesService(document.createElement('div'))
      } catch (error) {
        safeLog('error', '[CityAutocomplete] Falha ao carregar Google Maps', { error })
      }
    })()
  }, [])

  const debouncedFetch = useMemo(() => {
    let timer: any
    return (q: string) => {
      clearTimeout(timer)
      timer = setTimeout(() => fetchSuggestions(q), 200)
    }
  }, [country])

  async function fetchSuggestions(text: string) {
    const trimmed = text.trim()
    // validações avançadas
    setErrorMsg(null)
    const unicodePattern = /^[\p{L}\p{M}\s\-']+$/u
    const stateAbbrevPattern = /^[A-Z]{2,3}$/
    const hasInvalidChars = trimmed.length > 0 && !unicodePattern.test(trimmed) && !stateAbbrevPattern.test(trimmed)
    if (hasInvalidChars) {
      const hasDigits = /\d/.test(trimmed)
      const invalidSymbols = /[^\p{L}\p{M}\s\-']/u.test(trimmed)
      setSuggestions([])
      setErrorMsg(hasDigits ? 'Formato inválido - utilize apenas letras e caracteres especiais' : 'Caracteres não permitidos - remova símbolos inválidos')
      return
    }
    // Permitir busca com pelo menos 2 caracteres para melhorar UX
    if (trimmed && trimmed.length < 2 && !stateAbbrevPattern.test(trimmed)) {
      setSuggestions([])
      setErrorMsg(null)
      return
    }
    if (!trimmed || !autocompleteSvcRef.current) {
      setSuggestions([])
      return
    }

    const cacheKey = `${country || 'ALL'}:${normalize(trimmed)}`
    if (cacheRef.current.has(cacheKey)) {
      setSuggestions(cacheRef.current.get(cacheKey)!)
      return
    }

    setLoading(true)
    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: trimmed,
        types: ['geocode'],
        ...(country ? { componentRestrictions: { country } } : {})
      }
      autocompleteSvcRef.current.getPlacePredictions(request, (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setSuggestions([])
          setLoading(false)
          if (trimmed.length >= 3 || stateAbbrevPattern.test(trimmed)) {
            setErrorMsg('Cidade não encontrada - verifique a grafia ou selecione uma sugestão')
          }
          return
        }
        const items: CityOption[] = predictions
          .slice(0, 20)
          .map(p => {
            // Extrair estado da descrição quando disponível
            const description = p.description || ''
            const parts = description.split(',')
            let state = ''
            let countryCode = ''
            
            // Tentar extrair estado e país da descrição
            if (parts.length >= 2) {
              // Normalmente formato: "Cidade, Estado, País"
              const statePart = parts[parts.length - 2]?.trim() || ''
              const countryPart = parts[parts.length - 1]?.trim() || ''
              
              // Verificar se é um estado (geralmente 2-3 palavras ou sigla)
              if (statePart.length <= 30 && !statePart.match(/^\d+$/)) {
                state = statePart
              }
              
              // Extrair código do país se disponível
              const countryMatch = countryPart.match(/^([A-Z]{2})/)
              if (countryMatch) {
                countryCode = countryMatch[1]
              }
            }
            
            return {
              name: p.structured_formatting?.main_text || p.description.split(',')[0] || p.description,
              country: parts[parts.length - 1]?.trim() || '',
              countryCode,
              state,
              placeId: p.place_id
            }
          })
          // Filtrar para mostrar apenas cidades que começam com o texto digitado (case-insensitive, sem acentos)
          .filter(item => {
            const normalizedQuery = normalize(trimmed)
            const normalizedCity = normalize(item.name)
            return normalizedCity.startsWith(normalizedQuery)
          })
        
        cacheRef.current.set(cacheKey, items)
        setSuggestions(items)
        setLoading(false)
        setErrorMsg(null)
        setActiveIndex(items.length ? 0 : -1)
      })
    } catch (error) {
      safeLog('error', '[CityAutocomplete] Erro ao buscar sugestões', { error })
      setSuggestions([])
      setLoading(false)
    }
  }

  async function fetchDetails(placeId: string): Promise<CityOption | null> {
    if (!placesSvcRef.current) return null
    return new Promise(resolve => {
      const req: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: ['address_components', 'name']
      }
      placesSvcRef.current!.getDetails(req, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          return resolve(null)
        }
        const comps = place.address_components || []
        const get = (type: string) => comps.find(c => (c.types || []).includes(type))
        const getLongName = (type: string) => get(type)?.long_name || ''
        const getShortName = (type: string) => get(type)?.short_name || ''
        
        const country = getLongName('country')
        const countryCode = getShortName('country') || ''
        const state = getLongName('administrative_area_level_1') || ''
        const region = getLongName('administrative_area_level_2') || ''
        
        resolve({
          name: place.name || '',
          country,
          countryCode,
          state,
          region,
          placeId
        })
      })
    })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    onChange?.(v)
    setOpen(true)
    debouncedFetch(v)
  }

  async function handleSelect(item: CityOption) {
    let selected = item
    if (item.placeId) {
      const detailsPromise = fetchDetails(item.placeId)
      const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
      const details = await Promise.race([detailsPromise, timeoutPromise])
      if (details) selected = { ...selected, ...details }
    }
    
    // Formatar como "Cidade - Estado" quando houver estado
    let displayValue = selected.name
    if (selected.state) {
      // Para Brasil, usar sigla do estado se disponível
      if (selected.countryCode === 'BR' || country === 'BR') {
        const stateAbbrev = getStateAbbreviation(selected.state)
        displayValue = `${selected.name} - ${stateAbbrev}`
      } else {
        displayValue = `${selected.name} - ${selected.state}`
      }
    }
    
    setQuery(displayValue)
    setOpen(false)
    onChange?.(displayValue)
    onSelect?.(selected)
    localStorage.setItem('onboarding.city', displayValue)
    if (country) localStorage.setItem('onboarding.country', country)
  }

  return (
    <div className="space-y-2 w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="w-full">
        <div className="w-full min-w-0">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Input
                id={id}
                role="combobox"
                aria-expanded={open}
                aria-controls={`${id}-list`}
                placeholder={country === 'BR' ? 'Digite sua cidade (Ex: Belo Horizonte - MG)' : placeholder}
                value={query}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                onMouseDown={() => setOpen(true)}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
                className="w-full h-10 px-4 py-2 text-[14px] md:text-[14px] lg:text-[16px]"
              />
            </PopoverTrigger>
            <PopoverContent className="p-0 w-full md:w-[28rem] transition-all duration-200">
              <Command>
                <CommandInput placeholder="Pesquisar cidade" />
                <CommandList id={`${id}-list`}>
                  <CommandEmpty>{loading ? 'Carregando...' : (errorMsg || 'Nenhuma cidade encontrada')}</CommandEmpty>
                  <CommandGroup>
                    <div
                      ref={listRef}
                      className="max-h-64 overflow-auto"
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setActiveIndex(i => Math.max(i - 1, 0))
                        } else if (e.key === 'Enter' && activeIndex >= 0) {
                          e.preventDefault()
                          handleSelect(suggestions[activeIndex])
                        }
                      }}
                    >
                      {suggestions.map((s, idx) => {
                        // Formatar exibição da sugestão
                        let displayText = s.name
                        let subtitle = ''
                        
                        if (s.state) {
                          const stateAbbrev = (s.countryCode === 'BR' || country === 'BR') 
                            ? getStateAbbreviation(s.state) 
                            : s.state
                          subtitle = stateAbbrev
                          if (s.country && s.country !== s.state) {
                            subtitle += ` • ${s.country}`
                          }
                        } else if (s.region || s.country) {
                          subtitle = [s.region, s.country].filter(Boolean).join(' • ')
                        }
                        
                        return (
                          <CommandItem
                            id={`${id}-opt-${idx}`}
                            key={`${s.placeId || s.name}-${idx}`}
                            onSelect={() => handleSelect(s)}
                            className={activeIndex === idx ? 'bg-accent' : ''}
                            onMouseEnter={() => setActiveIndex(idx)}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {highlightMatch(displayText, query)}
                              </span>
                              {subtitle && (
                                <span className="text-xs text-muted-foreground">
                                  {subtitle}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </div>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errorMsg && (
            <p className="mt-1 text-sm text-destructive">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default CityAutocomplete

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const q = normalize(query)
  const t = normalize(text)
  const idx = t.indexOf(q)
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return (
    <>
      {before}
      <mark className="bg-yellow-200 text-foreground rounded-sm px-0.5">{match}</mark>
      {after}
    </>
  )
}