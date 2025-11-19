import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface ScrapedEvent {
    name: string
    event_start_date: string
    event_end_date?: string
    image_url?: string
    ticket_url: string
    address?: string
    city: string
    state: string
    source_id: string
    description?: string
    metadata?: any
    lat?: number
    lng?: number
}

// Configuração de headers para evitar bloqueios
const SCRAPING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { lat, lng, city, state } = await req.json()

        if (!city || !state) {
            return new Response(
                JSON.stringify({ error: 'City and state are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`🕷️ [spider-events] Iniciando varredura para: ${city}, ${state}`)

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Obter data atual e próximos 30 dias
        const today = new Date()
        const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

        // Run scrapers in parallel
        const results = await Promise.allSettled([
            scrapeSympla(city, state, today, nextMonth),
            scrapeEventbrite(city, state, today, nextMonth),
            scrapeIngresse(city, state, today, nextMonth),
            scrapeShotgun(city, state, today, nextMonth)
        ])

        const allEvents: ScrapedEvent[] = []
        const errors: string[] = []

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allEvents.push(...result.value)
                console.log(`✅ [spider-events] Scraper ${['Sympla', 'Eventbrite', 'Ingresse', 'Shotgun'][index]}: ${result.value.length} eventos`)
            } else {
                console.error(`❌ [spider-events] Scraper ${['Sympla', 'Eventbrite', 'Ingresse', 'Shotgun'][index]} falhou:`, result.reason)
                errors.push(`${['Sympla', 'Eventbrite', 'Ingresse', 'Shotgun'][index]}: ${result.reason}`)
            }
        })

        console.log(`📊 [spider-events] Total de eventos encontrados: ${allEvents.length}`)

        // Remover duplicatas por source_id
        const uniqueEvents = allEvents.filter((event, index, self) => 
            index === self.findIndex(e => e.source_id === event.source_id)
        )

        console.log(`📊 [spider-events] Eventos únicos: ${uniqueEvents.length}`)

        // Persist to database
        let savedCount = 0
        let updatedCount = 0

        for (const event of uniqueEvents) {
            try {
                // Verificar se já existe
                const { data: existing } = await supabaseAdmin
                    .from('locations')
                    .select('id')
                    .eq('source_id', event.source_id)
                    .single()

                if (existing) {
                    // Atualizar evento existente
                    const { error: updateError } = await supabaseAdmin
                        .from('locations')
                        .update({
                            name: event.name,
                            event_start_date: event.event_start_date,
                            event_end_date: event.event_end_date,
                            image_url: event.image_url || '',
                            ticket_url: event.ticket_url,
                            address: event.address || `${city}, ${state}`,
                            city: event.city,
                            state: event.state,
                            description: event.description,
                            metadata: event.metadata,
                            type: 'event',
                            lat: event.lat || getCityCenter(event.city, event.state).lat,
                            lng: event.lng || getCityCenter(event.city, event.state).lng,
                            is_active: true,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id)

                    if (updateError) {
                        console.error(`❌ Erro ao atualizar evento ${event.name}:`, updateError)
                    } else {
                        updatedCount++
                    }
                } else {
                    // Inserir novo evento
                    const { error: insertError } = await supabaseAdmin
                        .from('locations')
                        .insert({
                            name: event.name,
                            event_start_date: event.event_start_date,
                            event_end_date: event.event_end_date,
                            image_url: event.image_url || '',
                            ticket_url: event.ticket_url,
                            address: event.address || `${city}, ${state}`,
                            city: event.city,
                            state: event.state,
                            source_id: event.source_id,
                            description: event.description,
                            metadata: event.metadata,
                            type: 'event',
                            lat: event.lat || getCityCenter(event.city, event.state).lat,
                            lng: event.lng || getCityCenter(event.city, event.state).lng,
                            is_active: true
                        })

                    if (insertError) {
                        console.error(`❌ Erro ao salvar evento ${event.name}:`, insertError)
                    } else {
                        savedCount++
                    }
                }
            } catch (error) {
                console.error(`❌ Erro ao processar evento ${event.name}:`, error)
            }
        }

        console.log(`💾 [spider-events] Salvo: ${savedCount} novos, Atualizado: ${updatedCount} existentes`)

        return new Response(
            JSON.stringify({
                message: `Scraping concluído. Encontrados ${uniqueEvents.length}, Salvos ${savedCount}, Atualizados ${updatedCount}`,
                count: savedCount + updatedCount,
                saved: savedCount,
                updated: updatedCount,
                errors: errors.length > 0 ? errors : undefined
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('💥 [spider-events] Erro crítico:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// --- Scrapers Aprimorados ---

async function scrapeSympla(city: string, state: string, startDate: Date, endDate: Date): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = []
    try {
        const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-')
        const stateSlug = state.toLowerCase()
        
        // URL com filtros de data
        const url = `https://www.sympla.com.br/eventos/${citySlug}-${stateSlug}?data=${formatDateForSympla(startDate)}-${formatDateForSympla(endDate)}`
        
        console.log(`🔍 [Sympla] Buscando: ${url}`)
        
        const response = await fetch(url, { headers: SCRAPING_HEADERS })
        
        if (!response.ok) {
            console.warn(`⚠️ [Sympla] Resposta ${response.status}, tentando URL alternativa...`)
            // Tentar URL mais simples
            const simpleUrl = `https://www.sympla.com.br/eventos/${citySlug}-${stateSlug}`
            const simpleResponse = await fetch(simpleUrl, { headers: SCRAPING_HEADERS })
            if (!simpleResponse.ok) throw new Error(`Sympla: ${simpleResponse.status}`)
            
            const html = await simpleResponse.text()
            return parseSymplaHTML(html, city, state)
        }
        
        const html = await response.text()
        return parseSymplaHTML(html, city, state)
        
    } catch (e) {
        console.error('❌ [Sympla] Erro:', e)
    }
    return events
}

function parseSymplaHTML(html: string, city: string, state: string): ScrapedEvent[] {
    const events: ScrapedEvent[] = []
    const $ = cheerio.load(html)
    
    // Múltiplos seletores possíveis para cards de evento
    const eventSelectors = [
        '[data-testid="event-card"]',
        '.EventCard_event-card__',
        '.event-card',
        '[class*="EventCard"]',
        '[class*="event-card"]'
    ]
    
    for (const selector of eventSelectors) {
        const cards = $(selector)
        if (cards.length > 0) {
            console.log(`✅ [Sympla] Encontrados ${cards.length} cards com seletor: ${selector}`)
            
            cards.each((_, element) => {
                try {
                    const $card = $(element)
                    
                    // Nome do evento
                    const name = $card.find('h3, h2, [class*="title"], [class*="name"]').first().text().trim()
                    
                    // Link do evento
                    const link = $card.find('a').first().attr('href')
                    
                    // Data e horário
                    const dateText = $card.find('[class*="date"], [class*="Date"], [data-testid*="date"]').text().trim()
                    
                    // Imagem
                    const image = $card.find('img').first().attr('src')
                    
                    // Preço (se disponível)
                    const price = $card.find('[class*="price"], [class*="Price"]').text().trim()
                    
                    if (name && link) {
                        const ticketUrl = link.startsWith('http') ? link : `https://www.sympla.com.br${link}`
                        const sourceId = `sympla_${link.split('/').pop() || Math.random().toString(36).substr(2, 9)}`
                        
                        events.push({
                            name,
                            ticket_url: ticketUrl,
                            event_start_date: parseBrazilianDate(dateText) || new Date(Date.now() + 86400000).toISOString(),
                            image_url: image && image.startsWith('http') ? image : undefined,
                            city,
                            state,
                            source_id: sourceId,
                            description: price ? `Preço: ${price}` : undefined,
                            metadata: { 
                                source: 'sympla', 
                                dateText,
                                price 
                            }
                        })
                    }
                } catch (parseError) {
                    console.warn('⚠️ [Sympla] Erro ao parsear card:', parseError)
                }
            })
            break
        }
    }
    
    if (events.length === 0) {
        console.warn('⚠️ [Sympla] Nenhum evento encontrado com os seletores padrão, tentando JSON-LD...')
        
        // Tentar extrair de JSON-LD como fallback
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const jsonData = JSON.parse($(element).html() || '{}')
                const eventsList = Array.isArray(jsonData) ? jsonData : [jsonData]
                
                eventsList.forEach(item => {
                    if (item['@type'] === 'Event') {
                        events.push({
                            name: item.name,
                            ticket_url: item.url,
                            event_start_date: item.startDate,
                            event_end_date: item.endDate,
                            image_url: item.image,
                            city,
                            state,
                            source_id: `sympla_ld_${item.url || Math.random().toString(36).substr(2, 9)}`,
                            description: item.description,
                            metadata: { source: 'sympla-jsonld' }
                        })
                    }
                })
            } catch (e) {
                // Ignorar erros de parse
            }
        })
    }
    
    return events
}

async function scrapeEventbrite(city: string, state: string, startDate: Date, endDate: Date): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = []
    try {
        const stateSlug = state.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-')
        
        // URL com período de 30 dias
        const url = `https://www.eventbrite.com.br/d/${stateSlug}--${citySlug}/all-events/?start_date=${formatDateForEventbrite(startDate)}&end_date=${formatDateForEventbrite(endDate)}`
        
        console.log(`🔍 [Eventbrite] Buscando: ${url}`)
        
        const response = await fetch(url, { headers: SCRAPING_HEADERS })
        
        if (!response.ok) throw new Error(`Eventbrite: ${response.status}`)
        
        const html = await response.text()
        const $ = cheerio.load(html)
        
        // Eventbrite tem JSON-LD bem estruturado
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const jsonData = JSON.parse($(element).html() || '{}')
                const eventsList = Array.isArray(jsonData) ? jsonData : [jsonData]
                
                eventsList.forEach(item => {
                    if (item['@type'] === 'Event' || item['@type'] === 'MusicEvent' || item['@type'] === 'Festival') {
                        // Filtrar por data
                        const eventDate = new Date(item.startDate)
                        if (eventDate >= startDate && eventDate <= endDate) {
                            events.push({
                                name: item.name,
                                event_start_date: item.startDate,
                                event_end_date: item.endDate,
                                image_url: item.image,
                                ticket_url: item.url,
                                address: item.location?.address?.streetAddress || item.location?.name,
                                city,
                                state,
                                source_id: `eventbrite_${item.url?.split('/').pop() || Math.random().toString(36).substr(2, 9)}`,
                                description: item.description,
                                metadata: { 
                                    source: 'eventbrite',
                                    location: item.location,
                                    organizer: item.organizer
                                }
                            })
                        }
                    }
                })
            } catch (e) {
                // Ignorar erros de parse
            }
        })
        
        // Também procurar por cards visuais como backup
        if (events.length === 0) {
            $('[data-testid="event-card"], [class*="event-card"], .eds-event-card').each((_, element) => {
                try {
                    const $card = $(element)
                    
                    const name = $card.find('h3, h2, [class*="title"]').first().text().trim()
                    const link = $card.find('a').first().attr('href')
                    const dateText = $card.find('[class*="date"], [class*="time"]').text().trim()
                    const image = $card.find('img').first().attr('src')
                    
                    if (name && link) {
                        events.push({
                            name,
                            ticket_url: link.startsWith('http') ? link : `https://www.eventbrite.com.br${link}`,
                            event_start_date: parseBrazilianDate(dateText) || new Date(Date.now() + 86400000).toISOString(),
                            image_url: image,
                            city,
                            state,
                            source_id: `eventbrite_card_${link.split('/').pop() || Math.random().toString(36).substr(2, 9)}`,
                            metadata: { source: 'eventbrite-card', dateText }
                        })
                    }
                } catch (parseError) {
                    console.warn('⚠️ [Eventbrite] Erro ao parsear card:', parseError)
                }
            })
        }
        
    } catch (e) {
        console.error('❌ [Eventbrite] Erro:', e)
    }
    return events
}

async function scrapeIngresse(city: string, state: string, startDate: Date, endDate: Date): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = []
    try {
        const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-')
        
        // Ingresse usa Next.js com hidratação
        const url = `https://ingresse.com/br/${citySlug}`
        
        console.log(`🔍 [Ingresse] Buscando: ${url}`)
        
        const response = await fetch(url, { headers: SCRAPING_HEADERS })
        
        if (!response.ok) throw new Error(`Ingresse: ${response.status}`)
        
        const html = await response.text()
        const $ = cheerio.load(html)
        
        // Procurar por JSON de hidratação do Next.js
        $('script[id="__NEXT_DATA__"]').each((_, element) => {
            try {
                const nextData = JSON.parse($(element).html() || '{}')
                
                // Navegar pela estrutura do Next.js para encontrar eventos
                const eventsData = findEventsInNextData(nextData)
                
                eventsData.forEach((event: any) => {
                    const eventDate = new Date(event.startDate || event.date)
                    if (eventDate >= startDate && eventDate <= endDate) {
                        events.push({
                            name: event.title || event.name,
                            event_start_date: event.startDate || event.date,
                            event_end_date: event.endDate,
                            image_url: event.image || event.banner,
                            ticket_url: event.url || `https://ingresse.com${event.slug}`,
                            address: event.venue?.address || event.address,
                            city,
                            state,
                            source_id: `ingresse_${event.id || event.slug || Math.random().toString(36).substr(2, 9)}`,
                            description: event.description,
                            metadata: { 
                                source: 'ingresse',
                                venue: event.venue,
                                category: event.category
                            }
                        })
                    }
                })
            } catch (e) {
                console.warn('⚠️ [Ingresse] Erro ao parsear Next.js data:', e)
            }
        })
        
        // Fallback: procurar cards visuais
        if (events.length === 0) {
            $('[class*="event"], [class*="card"], [data-testid*="event"]').each((_, element) => {
                try {
                    const $card = $(element)
                    
                    const name = $card.find('h3, h2, [class*="title"]').first().text().trim()
                    const link = $card.find('a').first().attr('href')
                    const dateText = $card.find('[class*="date"]').text().trim()
                    const image = $card.find('img').first().attr('src')
                    
                    if (name && link) {
                        events.push({
                            name,
                            ticket_url: link.startsWith('http') ? link : `https://ingresse.com${link}`,
                            event_start_date: parseBrazilianDate(dateText) || new Date(Date.now() + 86400000).toISOString(),
                            image_url: image,
                            city,
                            state,
                            source_id: `ingresse_card_${link.split('/').pop() || Math.random().toString(36).substr(2, 9)}`,
                            metadata: { source: 'ingresse-card', dateText }
                        })
                    }
                } catch (parseError) {
                    console.warn('⚠️ [Ingresse] Erro ao parsear card:', parseError)
                }
            })
        }
        
    } catch (e) {
        console.error('❌ [Ingresse] Erro:', e)
    }
    return events
}

async function scrapeShotgun(city: string, state: string, startDate: Date, endDate: Date): Promise<ScrapedEvent[]> {
    const events: ScrapedEvent[] = []
    try {
        // Shotgun é uma SPA, tentar acessar a API interna ou página da cidade
        const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-')
        
        // Tentar diferentes URLs possíveis
        const urls = [
            `https://shotgun.com.br/${citySlug}`,
            `https://shotgun.com.br/events/${citySlug}`,
            `https://shotgun.com.br/cidade/${citySlug}`,
            `https://shotgun.com.br/api/events?city=${citySlug}`
        ]
        
        for (const url of urls) {
            try {
                console.log(`🔍 [Shotgun] Tentando: ${url}`)
                
                const response = await fetch(url, { 
                    headers: {
                        ...SCRAPING_HEADERS,
                        'Accept': 'application/json, text/plain, */*',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                
                if (!response.ok) continue
                
                const contentType = response.headers.get('content-type')
                
                if (contentType?.includes('application/json')) {
                    // Resposta JSON - API encontrada!
                    const jsonData = await response.json()
                    const eventsData = Array.isArray(jsonData) ? jsonData : jsonData.events || jsonData.data || []
                    
                    eventsData.forEach((event: any) => {
                        const eventDate = new Date(event.date || event.start_date || event.startDate)
                        if (eventDate >= startDate && eventDate <= endDate) {
                            events.push({
                                name: event.title || event.name,
                                event_start_date: event.date || event.start_date || event.startDate,
                                event_end_date: event.end_date || event.endDate,
                                image_url: event.image || event.banner || event.cover,
                                ticket_url: event.url || `https://shotgun.com.br/events/${event.slug || event.id}`,
                                address: event.venue?.address || event.address,
                                city,
                                state,
                                source_id: `shotgun_${event.id || event.slug || Math.random().toString(36).substr(2, 9)}`,
                                description: event.description,
                                metadata: { 
                                    source: 'shotgun',
                                    venue: event.venue,
                                    genre: event.genre,
                                    lineup: event.lineup
                                }
                            })
                        }
                    })
                    
                    if (events.length > 0) {
                        console.log(`✅ [Shotgun] API JSON encontrada! ${events.length} eventos`)
                        break
                    }
                } else {
                    // Resposta HTML - parsear como HTML
                    const html = await response.text()
                    const $ = cheerio.load(html)
                    
                    // Procurar JSON-LD
                    $('script[type="application/ld+json"]').each((_, element) => {
                        try {
                            const jsonData = JSON.parse($(element).html() || '{}')
                            const eventsList = Array.isArray(jsonData) ? jsonData : [jsonData]
                            
                            eventsList.forEach(item => {
                                if (item['@type'] === 'Event') {
                                    const eventDate = new Date(item.startDate)
                                    if (eventDate >= startDate && eventDate <= endDate) {
                                        events.push({
                                            name: item.name,
                                            event_start_date: item.startDate,
                                            event_end_date: item.endDate,
                                            image_url: item.image,
                                            ticket_url: item.url,
                                            address: item.location?.address?.streetAddress,
                                            city,
                                            state,
                                            source_id: `shotgun_ld_${item.url || Math.random().toString(36).substr(2, 9)}`,
                                            description: item.description,
                                            metadata: { source: 'shotgun-jsonld' }
                                        })
                                    }
                                }
                            })
                        } catch (e) {
                            // Ignorar
                        }
                    })
                    
                    // Procurar cards visuais
                    if (events.length === 0) {
                        $('[class*="event"], [class*="card"], [data-testid*="event"]').each((_, element) => {
                            try {
                                const $card = $(element)
                                
                                const name = $card.find('h3, h2, [class*="title"]').first().text().trim()
                                const link = $card.find('a').first().attr('href')
                                const dateText = $card.find('[class*="date"]').text().trim()
                                const image = $card.find('img').first().attr('src')
                                
                                if (name && link) {
                                    events.push({
                                        name,
                                        ticket_url: link.startsWith('http') ? link : `https://shotgun.com.br${link}`,
                                        event_start_date: parseBrazilianDate(dateText) || new Date(Date.now() + 86400000).toISOString(),
                                        image_url: image,
                                        city,
                                        state,
                                        source_id: `shotgun_card_${link.split('/').pop() || Math.random().toString(36).substr(2, 9)}`,
                                        metadata: { source: 'shotgun-card', dateText }
                                    })
                                }
                            } catch (parseError) {
                                console.warn('⚠️ [Shotgun] Erro ao parsear card:', parseError)
                            }
                        })
                    }
                    
                    if (events.length > 0) {
                        console.log(`✅ [Shotgun] HTML parseado! ${events.length} eventos`)
                        break
                    }
                }
            } catch (fetchError) {
                console.warn(`⚠️ [Shotgun] Erro ao acessar ${url}:`, fetchError)
                continue
            }
        }
        
    } catch (e) {
        console.error('❌ [Shotgun] Erro:', e)
    }
    return events
}

// --- Funções Auxiliares ---

function getCityCenter(city: string, state: string): { lat: number; lng: number } {
    // Coordenadas aproximadas dos centros das principais cidades brasileiras
    const cityCenters: { [key: string]: { lat: number; lng: number } } = {
        'sao-paulo': { lat: -23.5505, lng: -46.6333 },
        'rio-de-janeiro': { lat: -22.9068, lng: -43.1729 },
        'belo-horizonte': { lat: -19.9167, lng: -43.9345 },
        'brasilia': { lat: -15.7801, lng: -47.9292 },
        'salvador': { lat: -12.9714, lng: -38.5014 },
        'fortaleza': { lat: -3.7172, lng: -38.5434 },
        'curitiba': { lat: -25.4284, lng: -49.2733 },
        'recife': { lat: -8.0476, lng: -34.8770 },
        'porto-alegre': { lat: -30.0346, lng: -51.2177 },
        'goiania': { lat: -16.6869, lng: -49.2648 },
        'campinas': { lat: -22.9056, lng: -47.0608 },
        'sao-luis': { lat: -2.5297, lng: -44.3028 },
        'teresina': { lat: -5.0892, lng: -42.8019 },
        'natal': { lat: -5.7945, lng: -35.2110 },
        'campo-grande': { lat: -20.4697, lng: -54.6201 },
        'joao-pessoa': { lat: -7.1195, lng: -34.8450 },
        'aracaju': { lat: -10.9472, lng: -37.0731 },
        'cuiaba': { lat: -15.6014, lng: -56.0979 },
        'florianopolis': { lat: -27.5954, lng: -48.5480 },
        'vitoria': { lat: -20.3155, lng: -40.3128 },
        'belem': { lat: -1.4558, lng: -48.4902 },
        'macapa': { lat: 0.0349, lng: -51.0694 },
        'porto-velho': { lat: -8.7608, lng: -63.9020 },
        'boa-vista': { lat: 2.8235, lng: -60.6758 },
        'palmas': { lat: -10.2491, lng: -48.3243 },
        'manaus': { lat: -3.1190, lng: -60.0217 },
        'rio-branco': { lat: -9.9754, lng: -67.8249 }
    };
    
    // Limpar e normalizar o nome da cidade
    const cleanCity = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-');
    
    // Retornar coordenadas da cidade ou padrão de São Paulo
    return cityCenters[cleanCity] || { lat: -23.5505, lng: -46.6333 };
}

function findEventsInNextData(data: any): any[] {
    const events: any[] = []
    
    function searchForEvents(obj: any) {
        if (typeof obj === 'object' && obj !== null) {
            // Procurar por arrays de eventos
            if (Array.isArray(obj)) {
                obj.forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        if (item.title || item.name || item.event_type) {
                            events.push(item)
                        }
                        searchForEvents(item)
                    }
                })
            } else {
                // Procurar por objetos com propriedades de evento
                if (obj.title || obj.name || obj.event_type || obj.startDate || obj.date) {
                    events.push(obj)
                }
                // Recursivamente procurar em todas as propriedades
                Object.values(obj).forEach(value => searchForEvents(value))
            }
        }
    }
    
    searchForEvents(data)
    return events
}

function parseBrazilianDate(dateStr: string): string | null {
    if (!dateStr) return null
    
    try {
        // Limpar string
        const cleanDate = dateStr.toLowerCase().trim()
        
        // Mapeamento de meses em português
        const months: { [key: string]: string } = {
            'jan': '01', 'jan': '01', 'janeiro': '01',
            'fev': '02', 'fev': '02', 'fevereiro': '02',
            'mar': '03', 'mar': '03', 'março': '03',
            'abr': '04', 'abr': '04', 'abril': '04',
            'mai': '05', 'mai': '05', 'maio': '05',
            'jun': '06', 'jun': '06', 'junho': '06',
            'jul': '07', 'jul': '07', 'julho': '07',
            'ago': '08', 'ago': '08', 'agosto': '08',
            'set': '09', 'set': '09', 'setembro': '09',
            'out': '10', 'out': '10', 'outubro': '10',
            'nov': '11', 'nov': '11', 'novembro': '11',
            'dez': '12', 'dez': '12', 'dezembro': '12'
        }
        
        // Padrões comuns de datas brasileiras
        const patterns = [
            /(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})/, // DD/MM/YYYY ou DD-MM-YYYY
            /(\d{1,2})[\/\-\s]([a-z]{3})[\/\-\s](\d{4})/, // DD/MMM/YYYY ou DD-MMM-YYYY
            /(\d{1,2})[\/\-\s]([a-z]+)[\/\-\s](\d{4})/, // DD/MES/YYYY
            /([a-z]{3}),?\s*(\d{1,2})\s*([a-z]{3})/, // Sáb, 22 Out
            /([a-z]{3}),?\s*(\d{1,2})\s*de\s*([a-z]+)/, // Sábado, 22 de outubro
        ]
        
        for (const pattern of patterns) {
            const match = cleanDate.match(pattern)
            if (match) {
                let day, month, year, hour = '00', minute = '00'
                
                // Extrair hora se existir
                const timeMatch = cleanDate.match(/(\d{1,2}):(\d{2})/)
                if (timeMatch) {
                    hour = timeMatch[1].padStart(2, '0')
                    minute = timeMatch[2]
                }
                
                if (match[0].includes('/')) {
                    // Formato DD/MM/YYYY
                    day = match[1].padStart(2, '0')
                    const monthText = match[2].toLowerCase()
                    month = months[monthText] || match[2].padStart(2, '0')
                    year = match[3]
                } else {
                    // Outros formatos
                    day = match[2].padStart(2, '0')
                    const monthText = match[3].toLowerCase()
                    month = months[monthText] || '01'
                    year = new Date().getFullYear().toString()
                }
                
                return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`
            }
        }
        
        // Tentar parsear com Date nativo como fallback
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString()
        }
        
        return null
    } catch (e) {
        return null
    }
}

function formatDateForSympla(date: Date): string {
    return date.toISOString().split('T')[0]
}

function formatDateForEventbrite(date: Date): string {
    return date.toISOString().split('T')[0]
}