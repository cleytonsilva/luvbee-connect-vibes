# Integração com Google Maps Platform - Documentação Técnica

## 1. Introdução

Esta documentação descreve a integração completa do **Luvbee2** com a **Google Maps Platform**. O sistema utiliza uma abordagem híbrida, combinando o SDK JavaScript no frontend para performance e experiência do usuário, com Edge Functions no Supabase para segurança, proxy e otimização de custos (cache).

O objetivo principal é fornecer funcionalidades de descoberta de locais ("Vibe Local"), detalhes de estabelecimentos e exibição de mapas, garantindo eficiência de custos e alta disponibilidade.

---

## 2. Configuração e Autenticação

### 2.1. Projeto Google Cloud
A integração depende de um projeto no Google Cloud Console com as seguintes APIs ativadas:
*   **Places API (New)**: Principal fonte de dados de locais.
*   **Maps JavaScript API**: Renderização de mapas e serviços no cliente.
*   **Geocoding API**: Conversão de coordenadas em endereços e vice-versa.
*   **Static Maps API**: (Opcional) Mapas estáticos leves.

### 2.2. Chaves de API (API Keys)

O projeto utiliza duas estratégias de chaves para segurança:

1.  **Chave Pública (Frontend)**
    *   **Variável**: `VITE_GOOGLE_MAPS_API_KEY`
    *   **Uso**: Carregamento do script do Maps, Autocomplete, e chamadas client-side.
    *   **Restrições (Recomendado)**: Deve ser restrita por **HTTP Referrer** (domínio da aplicação, ex: `luvbee.app/*`, `localhost:8080`).

2.  **Chave de Backend (Edge Functions)**
    *   **Variável**: `GOOGLE_MAPS_BACKEND_KEY` ou `GOOGLE_MAPS_API_KEY` (no Supabase Secrets).
    *   **Uso**: Chamadas server-side (Edge Functions) para `search-nearby`, `get-place-details` e `cache-place-photo`.
    *   **Restrições**: Deve ser restrita por **IP** (IPs das Edge Functions do Supabase) ou irrestrita (se IPs forem dinâmicos), mas mantida estritamente secreta.

---

## 3. Comunicação com as APIs

A comunicação é centralizada na classe `GooglePlacesService` (`src/services/google-places.service.ts`) e suportada por Edge Functions.

### 3.1. Maps JavaScript API (Client-Side)
*   **Carregamento**: Via `GoogleMapsLoader` (`@googlemaps/js-api-loader`), que injeta o script dinamicamente apenas quando necessário.
*   **Bibliotecas**: Utiliza principalmente a biblioteca `places` (versão nova) e `geocoding`.

### 3.2. Places API (New & Legacy)

O sistema prioriza a **Places API (New)** (v1) pela riqueza de dados e modelo de preços, mas mantém fallback para a API legada.

#### Métodos Principais:
*   **Search Nearby (`searchNearby`)**:
    1.  Tenta via **JS SDK (New Place API)**: `Place.searchNearby()`.
    2.  Se falhar ou auth erro, tenta via **JS SDK (Legacy)**: `PlacesService.nearbySearch()`.
    3.  Se falhar (ex: bloqueio de CORS ou quota client-side), faz fallback para **Edge Function** (`search-nearby`).
*   **Place Details (`getPlaceDetails`)**:
    1.  Tenta via **JS SDK (New Place API)**: `Place.fetchFields()`.
    2.  Fallback para **Edge Function** (`get-place-details`) se necessário.

### 3.3. Geocoding API
*   **Reverse Geocoding**: Converte coordenadas (lat/lng) em cidade/estado para contexto do usuário.
*   **Geocoding**: Converte endereços digitados em coordenadas.

---

## 4. Fluxo de Obtenção de Dados e Imagens

### 4.1. Fluxo de Busca ("Vibe Local")
1.  **Input**: Usuário seleciona uma "Vibe" (Date, Party, Culture) e localização.
2.  **Service**: `DiscoveryService` verifica cache local/banco.
3.  **Fetch**: Se não houver dados, chama `GooglePlacesService.searchNearby`.
    *   O serviço decide a melhor estratégia (JS SDK ou Edge Function).
    *   Parâmetros: `includedTypes` (mapeados da Vibe), `locationRestriction`, `minRating` (4.0).
4.  **Processamento**:
    *   Resultados são normalizados para a interface `GooglePlace`.
    *   Filtros de qualidade são aplicados (Rating > 4.0, Reviews > 10, Status Operacional).
5.  **Persistência**: Novos locais são salvos na tabela `locations` do Supabase para cache futuro.

### 4.2. Sistema de Cache de Imagens (Smart Proxy)
Para otimizar custos da *Places Photos API*, implementamos um proxy inteligente:

1.  **Frontend**: Solicita imagem via URL do proxy: `functions/v1/cache-place-photo?place_id=...&photo_reference=...`
2.  **Edge Function (`cache-place-photo`)**:
    *   **Passo 1 (Check DB)**: Verifica na tabela `locations` se o local já tem `image_storage_path`.
    *   **Passo 2 (Cache Hit)**: Se tiver, redireciona (307) diretamente para o Supabase Storage (Custo Zero de Google API).
    *   **Passo 3 (Cache Miss)**: Se não tiver:
        *   Baixa a imagem da Google Places API (Custo incorrido 1x).
        *   Faz upload para o bucket `places` no Supabase Storage.
        *   Atualiza a tabela `locations` com o caminho do arquivo.
        *   Retorna a imagem binária para o cliente.

---

## 5. Tratamento de Respostas e Erros

### Códigos de Erro Comuns
*   `ZERO_RESULTS`: Nenhum local encontrado na área. A UI deve mostrar um estado vazio amigável.
*   `OVER_QUERY_LIMIT`: Quota excedida. O sistema tenta fallback ou exibe erro genérico.
*   `REQUEST_DENIED`: Problema de API Key (restrição incorreta). Verifique o console do Google Cloud.
*   `INVALID_REQUEST`: Parâmetros faltando (ex: lat/lng).

### Estratégias de Fallback
*   **CORS**: O JS SDK resolve a maioria dos problemas de CORS. As Edge Functions atuam como proxy para chamadas REST que falhariam no browser.
*   **Place Photos**: Se a referência da foto falhar ou expirar, o sistema tenta buscar detalhes atualizados do local para obter uma nova referência.

---

## 6. Limites, Cotas e Otimização

### Otimizações Implementadas
1.  **Cache de Imagens**: Redução drástica de custos ao armazenar fotos no Supabase Storage após o primeiro acesso.
2.  **Field Masking**: Todas as requisições (JS e REST) solicitam apenas os campos estritamente necessários (`fields` ou `X-Goog-FieldMask`), reduzindo o custo por chamada (SKU).
3.  **Cache de Busca**: `DiscoveryService` e `GooglePlacesService` mantêm caches em memória e LocalStorage para evitar buscas repetidas na mesma área/sessão.
4.  **Debounce**: Buscas por texto ou movimento de mapa possuem debounce para evitar "rajadas" de requisições.

---

## 7. Considerações de Segurança

*   **API Key do Frontend**: Deve ser restrita por domínio HTTP no Google Cloud Console.
*   **API Key de Backend**: Deve ser mantida segura nas variáveis de ambiente do Supabase (`.env` local ou Secrets em produção). Nunca comitada no Git.
*   **Proxy**: As Edge Functions ocultam a chave de backend e permitem adicionar lógica de validação/Rate Limiting personalizada antes de chamar o Google.

---

## 8. Exemplos de Código

### Chamada Básica (Frontend Service)
```typescript
import { GooglePlacesService } from '@/services/google-places.service';

// Busca locais próximos
const results = await GooglePlacesService.searchNearby({
  latitude: -23.55052,
  longitude: -46.633309,
  radius: 2000,
  vibe_category: 'party'
});

if (results.data) {
  console.log('Locais encontrados:', results.data);
}
```

### URL para Cache de Imagem
```typescript
// Componente React
const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cache-place-photo?place_id=${placeId}&photo_reference=${photoRef}&maxwidth=800`;

return <img src={imageUrl} alt="Local" />;
```

### Parsing de Resposta (Edge Function)
```typescript
// Exemplo simplificado do parser na Edge Function
const places = data.places.map(place => ({
  name: place.displayName?.text,
  rating: place.rating,
  types: place.types,
  // Mapeamento seguro de campos aninhados
  photo_reference: place.photos?.[0]?.name
}));
```

---

## 9. Referências e Links Úteis

*   **Google Maps Platform Documentation**: [https://developers.google.com/maps/documentation](https://developers.google.com/maps/documentation)
*   **Places API (New)**: [https://developers.google.com/maps/documentation/places/web-service/op-overview](https://developers.google.com/maps/documentation/places/web-service/op-overview)
*   **Maps JavaScript API**: [https://developers.google.com/maps/documentation/javascript](https://developers.google.com/maps/documentation/javascript)
*   **Pricing & Usage**: [https://mapsplatform.google.com/pricing/](https://mapsplatform.google.com/pricing/)
*   **Supabase Edge Functions**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
