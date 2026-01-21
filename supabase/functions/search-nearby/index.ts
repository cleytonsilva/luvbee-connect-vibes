// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface GooglePlaceV1 {
  id: string
  displayName?: { text: string; languageCode: string }
  formattedAddress?: string
  shortFormattedAddress?: string
  priceLevel?: string
  rating?: number
  userRatingCount?: number
  photos?: Array<{
    name: string
    widthPx: number
    heightPx: number
  }>
  editorialSummary?: { text: string; languageCode: string }
  generativeSummary?: { overview: { text: string; languageCode: string } }
  types?: string[]
  primaryType?: string
  primaryTypeDisplayName?: { text: string; languageCode: string }
  location?: {
    latitude: number
    longitude: number
  }
  regularOpeningHours?: {
    openNow?: boolean
    periods?: Array<{
      open: { day: number; hour: number; minute: number }
      close?: { day: number; hour: number; minute: number }
    }>
    weekdayDescriptions?: string[]
  }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  businessStatus?: string
  servesBeer?: boolean
  servesWine?: boolean
  servesCocktails?: boolean
  servesDessert?: boolean
  servesCoffee?: boolean
  servesBreakfast?: boolean
  servesLunch?: boolean
  servesDinner?: boolean
  servesBrunch?: boolean
  servesVegetarianFood?: boolean
  goodForGroups?: boolean
  goodForChildren?: boolean
  goodForWatchingSports?: boolean
  liveMusic?: boolean
  outdoorSeating?: boolean
  menuForChildren?: boolean
  restroom?: boolean
  allowsDogs?: boolean
  delivery?: boolean
  dineIn?: boolean
  curbsidePickup?: boolean
  reservable?: boolean
  reviews?: Array<{
    text: { text: string; languageCode: string }
    rating: number
    authorAttribution: { displayName: string; uri: string; photoUri: string }
  }>
}

// Interface compatível com o app (GooglePlace)
interface AppGooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  rating?: number
  user_ratings_total?: number
  price_level?: number
  types?: string[]
  primary_type?: string
  editorial_summary?: string
  generative_summary?: string
  description?: string
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  phone_number?: string
  international_phone_number?: string
  website?: string
  google_maps_uri?: string
  business_status?: string
  features?: {
    serves_beer?: boolean
    serves_wine?: boolean
    serves_cocktails?: boolean
    serves_dessert?: boolean
    serves_coffee?: boolean
    serves_breakfast?: boolean
    serves_lunch?: boolean
    serves_dinner?: boolean
    serves_brunch?: boolean
    serves_vegetarian_food?: boolean
    good_for_groups?: boolean
    good_for_children?: boolean
    good_for_watching_sports?: boolean
    live_music?: boolean
    outdoor_seating?: boolean
    menu_for_children?: boolean
    restroom?: boolean
    allows_dogs?: boolean
    delivery?: boolean
    dine_in?: boolean
    curbside_pickup?: boolean
    reservable?: boolean
  }
  reviews?: Array<{
    text: string
    rating: number
    author_name: string
    author_url: string
  }>
}

// Definição das categorias permitidas e proibidas
const VIBE_CATEGORIES = {
  date: [
    "wine_bar", "cocktail_bar", "speakeasy", "lounge", "fine_dining_restaurant",
    "coffee_shop", "piano_bar", "bistro", "tapas_restaurant", "jazz_club",
    "teahouse", "japanese_restaurant", "italian_restaurant", "french_restaurant",
    "hotel_bar", "rooftop_bar"
  ],
  party: [
    "night_club", "live_music_venue", "pub", "beer_garden", "comedy_club",
    "karaoke_bar", "bar", "dance_hall", "concert_hall", "sports_bar",
    "brewpub", "irish_pub", "salsa_club", "disco_club"
  ],
  culture: [
    "art_gallery", "museum", "cultural_center", "bowling_alley", "amusement_park",
    "aquarium", "botanical_garden", "movie_theater", "performing_arts_theater",
    "escape_room", "minigolf_course", "ice_skating_rink"
  ]
};

// Lista negra global para garantir qualidade
const EXCLUDED_TYPES = [
  "fast_food_restaurant",
  "meal_takeaway",
  "meal_delivery",
  "sandwich_shop",
  "ice_cream_shop",
  "gas_station",
  "atm",
  "bank",
  "pharmacy",
  "supermarket",
  "shopping_mall", // Prefira restaurantes dentro do shopping, não o shopping em si
  "gym",
  "convenience_store",
  "car_repair",
  "car_wash",
  "laundry",
  "parking",
  // Novos bloqueios para locais não funcionais/inadequados
  "playground",
  "park", // Parques públicos geralmente não têm avaliações confiáveis
  "school",
  "primary_school",
  "secondary_school",
  "university",
  "hospital",
  "doctor",
  "dentist",
  "veterinary_care",
  "church",
  "mosque",
  "synagogue",
  "cemetery",
  "funeral_home",
  "government_office",
  "post_office",
  "police",
  "fire_station",
  "transit_station",
  "bus_station",
  "subway_station",
  "train_station",
  "airport",
  "real_estate_agency",
  "moving_company",
  "storage",
  "auto_parts_store",
  "hardware_store",
  "home_goods_store",
  "furniture_store",
  "electronics_store",
  "cell_phone_store",
  "clothing_store",
  "shoe_store",
  "jewelry_store",
  "beauty_salon",
  "hair_salon",
  "barber_shop",
  "spa",
  "nail_salon",
  "dry_cleaning",
  "tailor"
];

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { latitude, longitude, radius = 5000, vibe_category, includedTypes: requestedTypes } = body

    // Validar entrada
    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude e longitude são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter chave da API
    // @ts-ignore
    const apiKey = Deno.env.get('GOOGLE_MAPS_BACKEND_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Definir tipos (IncludedTypes) baseado na Vibe
    let includedTypes: string[] = []

    if (vibe_category && VIBE_CATEGORIES[vibe_category as keyof typeof VIBE_CATEGORIES]) {
      includedTypes = VIBE_CATEGORIES[vibe_category as keyof typeof VIBE_CATEGORIES];
    } else {
      // Default fallback misturando um pouco de tudo se não especificado
      includedTypes = requestedTypes || [
        ...VIBE_CATEGORIES.date.slice(0, 5),
        ...VIBE_CATEGORIES.party.slice(0, 5),
        ...VIBE_CATEGORIES.culture.slice(0, 3)
      ];
    }

    // Payload para Google Places API New (V1)
    const requestBody = {
      includedTypes: includedTypes,
      excludedTypes: EXCLUDED_TYPES, // Bloqueio explícito de tipos ruins
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: {
            latitude: Number(latitude),
            longitude: Number(longitude)
          },
          radius: Math.max(1, Math.min(50000, Number(radius)))
        }
      },
      rankPreference: "POPULARITY", // Requisito: Popularity
      minRating: 4.0 // Filtro de qualidade direto na API (se suportado ou fallback local)
    }

    console.log('[search-nearby] Buscando na Google Places API V1:', { latitude, longitude, radius, vibe_category, includedTypesCount: includedTypes.length })

    const response = await fetch(GOOGLE_PLACES_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Field Mask Otimizado + Rich Fields
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.editorialSummary,places.generativeSummary,places.types,places.location,places.servesBeer,places.servesWine,places.servesCocktails,places.goodForGroups,places.goodForChildren,places.regularOpeningHours,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.primaryType,places.primaryTypeDisplayName,places.shortFormattedAddress,places.addressComponents,places.plusCode,places.viewport,places.accessibilityOptions,places.parkingOptions,places.paymentOptions,places.outdoorSeating,places.liveMusic,places.menuForChildren,places.servesCocktails,places.servesDessert,places.servesCoffee,places.goodForWatchingSports,places.restroom,places.goodForChildren,places.allowsDogs,places.curbsidePickup,places.delivery,places.dineIn,places.reservable,places.servesBreakfast,places.servesLunch,places.servesDinner,places.servesBrunch,places.servesVegetarianFood,places.currentOpeningHours,places.currentSecondaryOpeningHours,places.reviews'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[search-nearby] Google API error: ${response.status} - ${errorText}`)
      throw new Error(`Google API error: ${response.statusText}`)
    }

    const data = await response.json()
    const results: AppGooglePlace[] = []

    if (data.places && data.places.length > 0) {
      for (const place of data.places as GooglePlaceV1[]) {
        // ==========================================
        // FILTROS DE QUALIDADE RIGOROSOS
        // ==========================================

        // 1. FILTRO: Rating mínimo de 4.0
        if (!place.rating || place.rating < 4.0) {
          console.log(`[search-nearby] ❌ Rejeitado "${place.displayName?.text}" - Rating muito baixo: ${place.rating || 'sem rating'}`);
          continue;
        }

        // 2. FILTRO: Número mínimo de avaliações (10 reviews)
        // Locais com poucas avaliações podem ser não funcionais ou de baixa qualidade
        if (!place.userRatingCount || place.userRatingCount < 10) {
          console.log(`[search-nearby] ❌ Rejeitado "${place.displayName?.text}" - Poucas avaliações: ${place.userRatingCount || 0}`);
          continue;
        }

        // 3. FILTRO: Business Status (deve estar operacional)
        if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
          console.log(`[search-nearby] ❌ Rejeitado "${place.displayName?.text}" - Status: ${place.businessStatus}`);
          continue;
        }

        // 4. FILTRO: Deve ter pelo menos uma foto
        if (!place.photos || place.photos.length === 0) {
          console.log(`[search-nearby] ❌ Rejeitado "${place.displayName?.text}" - Sem fotos`);
          continue;
        }

        // 5. FILTRO: Bloqueio de nomes suspeitos (playgrounds, parques genéricos, etc.)
        const suspiciousNamePatterns = [
          /playground/i,
          /parquinho/i,
          /pracinha/i,
          /quadra/i,
          /campo de futebol/i,
          /pista de skate/i,
          /academia ao ar livre/i,
          /ponto de ônibus/i,
          /parada de ônibus/i,
          /estação de metrô/i,
          /terminal/i,
          /cemitério/i,
          /igreja/i,
          /escola/i,
          /hospital/i,
          /posto de saúde/i,
          /delegacia/i,
          /correios/i
        ];

        const placeName = place.displayName?.text || '';
        if (suspiciousNamePatterns.some(pattern => pattern.test(placeName))) {
          console.log(`[search-nearby] ❌ Rejeitado "${placeName}" - Nome suspeito`);
          continue;
        }

        // 6. FILTRO: Deve ter endereço válido
        if (!place.formattedAddress && !place.shortFormattedAddress) {
          console.log(`[search-nearby] ❌ Rejeitado "${placeName}" - Sem endereço`);
          continue;
        }

        // 7. FILTRO: Para estabelecimentos de comida/bebida, deve ter pelo menos uma característica de serviço
        const isFoodOrDrink = place.types?.some(t =>
          ['restaurant', 'bar', 'cafe', 'night_club', 'bakery'].some(ft => t.includes(ft))
        );

        if (isFoodOrDrink) {
          const hasServiceFeature =
            place.servesBeer ||
            place.servesWine ||
            place.servesCocktails ||
            place.servesCoffee ||
            place.servesBreakfast ||
            place.servesLunch ||
            place.servesDinner ||
            place.delivery ||
            place.dineIn;

          // Se não tem nenhuma característica de serviço, pode ser um local não funcional
          // Mas vamos ser permissivos e só logar um warning
          if (!hasServiceFeature) {
            console.log(`[search-nearby] ⚠️ Warning "${placeName}" - Local de comida/bebida sem características de serviço`);
          }
        }

        console.log(`[search-nearby] ✅ Aceito "${placeName}" - Rating: ${place.rating}, Reviews: ${place.userRatingCount}`);

        // ==========================================
        // MAPEAMENTO DO LOCAL (passou em todos os filtros)
        // ==========================================

        // Descrição: Generative > Editorial > Fallback
        const description = place.generativeSummary?.overview?.text ||
          place.editorialSummary?.text ||
          `${place.types?.[0] || 'Local'} • ${place.rating} ⭐`

        const appPlace: AppGooglePlace = {
          place_id: place.id,
          name: place.displayName?.text || 'Desconhecido',
          formatted_address: place.formattedAddress || place.shortFormattedAddress || '',
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0
            }
          },
          photos: place.photos?.map(p => ({
            photo_reference: p.name,
            width: p.widthPx,
            height: p.heightPx
          })) || [],
          rating: place.rating,
          user_ratings_total: place.userRatingCount,
          price_level: mapPriceLevel(place.priceLevel),
          types: place.types,
          primary_type: place.primaryType,
          editorial_summary: place.editorialSummary?.text,
          generative_summary: place.generativeSummary?.overview?.text,
          description: description,
          opening_hours: place.regularOpeningHours ? {
            open_now: place.regularOpeningHours.openNow,
            weekday_text: place.regularOpeningHours.weekdayDescriptions
          } : undefined,
          phone_number: place.nationalPhoneNumber,
          international_phone_number: place.internationalPhoneNumber,
          website: place.websiteUri,
          google_maps_uri: place.googleMapsUri,
          business_status: place.businessStatus,
          features: {
            serves_beer: place.servesBeer,
            serves_wine: place.servesWine,
            serves_cocktails: place.servesCocktails,
            serves_dessert: place.servesDessert,
            serves_coffee: place.servesCoffee,
            serves_breakfast: place.servesBreakfast,
            serves_lunch: place.servesLunch,
            serves_dinner: place.servesDinner,
            serves_brunch: place.servesBrunch,
            serves_vegetarian_food: place.servesVegetarianFood,
            good_for_groups: place.goodForGroups,
            good_for_children: place.goodForChildren,
            good_for_watching_sports: place.goodForWatchingSports,
            live_music: place.liveMusic || place.types?.includes('live_music_venue'),
            outdoor_seating: place.outdoorSeating,
            menu_for_children: place.menuForChildren,
            restroom: place.restroom,
            allows_dogs: place.allowsDogs,
            delivery: place.delivery,
            dine_in: place.dineIn,
            curbside_pickup: place.curbsidePickup,
            reservable: place.reservable
          },
          reviews: place.reviews?.slice(0, 3).map(r => ({
            text: r.text?.text || '',
            rating: r.rating,
            author_name: r.authorAttribution?.displayName || 'Anônimo',
            author_url: r.authorAttribution?.uri || ''
          }))
        }

        results.push(appPlace)
      }
    }

    return new Response(
      JSON.stringify({ data: results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[search-nearby] Erro:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function mapPriceLevel(level?: string): number {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return 0
    case 'PRICE_LEVEL_INEXPENSIVE': return 1
    case 'PRICE_LEVEL_MODERATE': return 2
    case 'PRICE_LEVEL_EXPENSIVE': return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4
    default: return 0
  }
}
