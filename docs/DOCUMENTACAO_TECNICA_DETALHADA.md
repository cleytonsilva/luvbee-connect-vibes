# Documentação Técnica Detalhada - LuvBee

Este documento descreve profundamente o funcionamento técnico da plataforma LuvBee, focando em arquitetura, integrações de API, Edge Functions, sistema de imagens (Vibe Local), geolocalização e algoritmos de match.

---

## 1. Arquitetura Geral e Configurações de API

O sistema opera em uma arquitetura **Serverless** utilizando **Supabase** como backend as a service (BaaS) e **React Native (Expo)** para o frontend mobile.

### 1.1 Credenciais e Variáveis de Ambiente
O sistema depende das seguintes chaves configuradas no ambiente (Frontend `.env` e Supabase Secrets):

*   **Frontend (`.env`):**
    *   `VITE_SUPABASE_URL`: Endpoint da API do Supabase.
    *   `VITE_SUPABASE_ANON_KEY`: Chave pública para acesso via cliente (respeita RLS).
    *   `VITE_GOOGLE_MAPS_API_KEY`: Chave para mapas e geocoding no client-side.

*   **Backend (Supabase Edge Functions Secrets):**
    *   `SUPABASE_URL`: Endpoint interno.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Chave mestra (bypass RLS) para operações administrativas.
    *   `GOOGLE_MAPS_BACKEND_KEY` (ou `GOOGLE_MAPS_API_KEY`): Chave para acesso à Google Places API (New V1) no servidor.

### 1.2 Estrutura de Comunicação
1.  **Client-Side (App):** Realiza chamadas RPC (Remote Procedure Calls) ao banco de dados e invoca Edge Functions para tarefas pesadas ou que exigem segredos de servidor.
2.  **Edge Functions:** Rodam em Deno na infraestrutura da Supabase, atuando como middleware seguro para APIs de terceiros (Google).
3.  **Database (PostgreSQL):** Armazena dados, executa lógica de negócios via Triggers/Functions PL/PGSQL e gerencia segurança via RLS (Row Level Security).

---

## 2. Vibe Local: Funcionamento e Fluxo de Dados

A funcionalidade "Vibe Local" permite aos usuários descobrir locais (bares, restaurantes, baladas) baseados em sua localização e preferências.

### 2.1 Fluxo de Descoberta (`VibeLocalPage.tsx` e `useVibePlaces.ts`)

1.  **Determinação da Localização:**
    *   O sistema tenta obter o GPS do dispositivo (`navigator.geolocation`).
    *   **Fallback 1:** Se falhar, busca o endereço/cidade salvo no perfil do usuário (`users.location` ou `profile`).
    *   **Fallback 2:** Se ambos falharem, assume coordenadas padrão (São Paulo: -23.5505, -46.6333).

2.  **Verificação de Cache (Otimização):**
    *   Antes de chamar o Google, o hook `useVibePlaces` chama a RPC `check_search_cache`.
    *   Verifica na tabela `search_cache_logs` se houve uma busca recente (ex: últimos 30 dias) num raio próximo (ex: 5km).
    *   **Se Cache Válido:** Pula para o passo 4.
    *   **Se Cache Expirado/Inexistente:** Aciona o passo 3.

3.  **Busca e Sincronização (Edge Function `fetch-places-google`):**
    *   O frontend invoca a Edge Function `fetch-places-google` de forma não-bloqueante (fire-and-forget).
    *   **API Google Places V1:** A função chama `https://places.googleapis.com/v1/places:searchNearby`.
    *   **Filtragem:** Solicita apenas campos essenciais (FieldMask) e filtra locais com Rating >= 4.0.
    *   **Upsert:** Os locais retornados são salvos/atualizados nas tabelas `venues` e `locations` do banco de dados.

4.  **Recuperação de Dados (Leitura Local):**
    *   O frontend chama a RPC `get_places_nearby` (ou `get_places_by_city_state`).
    *   Esta função SQL busca na tabela `locations` local, aplicando filtros de distância (PostGIS), preferências do usuário (Comida/Bebida/Música) e removendo locais que o usuário já interagiu (Match/Reject).

---

## 3. Imagens dos Locais: "Como aparecem nos Cards"

O sistema utiliza uma estratégia agressiva de cache para garantir performance e reduzir custos com a API do Google Photos.

### 3.1 Componente Visual (`VibeCard.tsx`)
O card solicita a imagem através de uma URL proxy inteligente:
`{SUPABASE_URL}/functions/v1/cache-place-photo?place_id={ID}&photo_reference={REF}`

### 3.2 Lógica da Edge Function (`cache-place-photo`)
Quando a URL da imagem é acessada, a Edge Function executa o seguinte roteiro:

1.  **Verificação de Armazenamento (Cache Hit):**
    *   Consulta a tabela `locations` pelo `place_id`.
    *   Se o campo `image_storage_path` estiver preenchido, gera a URL pública do Supabase Storage e retorna um **Redirect 307** para ela.
    *   *Resultado:* O navegador carrega a imagem direto do bucket do Supabase (rápido e barato).

2.  **Busca no Google (Cache Miss):**
    *   Se não houver imagem salva, usa a `photo_reference` (ou busca os detalhes do lugar no Google se só tiver o ID).
    *   Faz o download da imagem da Google Places Photos API.

3.  **Processamento e Upload:**
    *   Faz o upload do binário da imagem para o bucket `places` no Supabase Storage.
    *   Nome do arquivo: `{place_id}/primary.jpg`.

4.  **Atualização do Banco:**
    *   Atualiza o registro na tabela `locations`, definindo `image_storage_path` com o caminho do arquivo recém-criado.

5.  **Retorno:**
    *   Retorna a imagem processada para o usuário.
    *   *Próximos acessos:* Cairão automaticamente no passo 1.

---

## 4. Armazenamento de Dados de Localização

Os dados geográficos são tratados com tipos nativos do PostGIS para eficiência em cálculos espaciais.

### 4.1 Tabelas Principais (`20250127000000_create_core_tables.sql`)

*   **`locations`**: Tabela central dos locais.
    *   `id`: UUID interno.
    *   `place_id`: ID único do Google (usado para deduplicação).
    *   `location`: Coluna do tipo `POINT` (PostGIS) para indexação espacial.
    *   `latitude` / `longitude`: Decimais para uso fácil no frontend.
    *   `google_places_data`: JSONB contendo dados brutos do Google para referência futura.

*   **`users`**:
    *   `location_latitude` / `location_longitude`: Última localização conhecida do usuário.
    *   `search_radius_km`: Preferência de raio de busca.

*   **`location_matches`**: Registra a interação do usuário com um local.
    *   `user_id` + `location_id`.
    *   Status: 'active' (Like/Quero ir).
    *   Garante que o local não apareça novamente na fila de descoberta.

### 4.2 Sincronização
Os dados são "vivos". Sempre que a Edge Function `fetch-places-google` roda, ela atualiza as informações dos locais (preço, rating, reviews) na tabela `locations`, mantendo o banco atualizado sem depender exclusivamente do tempo real do Google.

---

## 5. Cálculo de Matches (Algoritmos)

O sistema possui dois tipos de "Match": Usuário-Local e Usuário-Usuário.

### 5.1 Match Usuário-Local
*   **Ação:** Swipe Right no `VibeCard`.
*   **Armazenamento:** Insere registro na tabela `location_matches`.
*   **Efeito:** O local vai para a lista de "Meus Lugares" e influencia o algoritmo de compatibilidade com outras pessoas.

### 5.2 Match Usuário-Usuário (`CompatibilityService.ts` e RPC `calculate_compatibility_score`)
A compatibilidade entre duas pessoas é calculada dinamicamente com base em um "Score de Afinidade" (0 a 100).

**Fórmula do Score:**
1.  **Preferências (Peso 50%):**
    *   Compara vetores de preferências: Bebidas, Comida e Música.
    *   Cálculo: `(Interseção / Total de Preferências) * 50`.

2.  **Locais em Comum (Peso 30%):**
    *   Verifica a interseção de `location_matches` ativos entre os dois usuários.
    *   Quanto mais lugares ambos deram "Like", maior a pontuação.
    *   Cálculo: `(Locais em Comum * Fator Multiplicador) * 30`.

3.  **Proximidade / Outros (Peso 20%):**
    *   Reserva para cálculo baseado na distância física ou outros fatores demográficos.

**Processo de "People Match":**
1.  A Edge Function `potential-matches` seleciona candidatos próximos.
2.  Para cada candidato, executa a RPC `calculate_compatibility_score`.
3.  Ordena os resultados por Score decrescente.
4.  Se ambos derem Like no perfil um do outro -> Cria registro em `people_matches` com status `mutual` -> Cria um chat na tabela `chats`.

---

## 6. Resumo dos Componentes

| Componente | Função Principal | Tecnologias |
| :--- | :--- | :--- |
| **fetch-places-google** | Buscar locais na API do Google e popular DB | Edge Function (Deno), Google Places API V1 |
| **cache-place-photo** | Proxy de imagens com cache automático | Edge Function, Supabase Storage |
| **useVibePlaces** | Hook de controle de fluxo de descoberta | React, TanStack Query (implícito/custom) |
| **VibeCard** | UI de apresentação e gestão de interação | React, Framer Motion |
| **RPC get_places_nearby** | Busca espacial performática | PostgreSQL, PostGIS |
| **RPC calculate_compatibility** | Algoritmo de Match | PL/PGSQL |

Este ecossistema garante que o app seja rápido (lendo do DB local), barato (cacheando imagens e dados) e inteligente (algoritmos de match rodando no banco).
