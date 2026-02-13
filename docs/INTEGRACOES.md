# Integrações do Sistema

Este documento descreve as integrações externas e configurações do sistema, conforme regras do projeto.

## 1. Google Places API

### 1.1. Visão Geral
O sistema utiliza a Google Places API para descoberta de locais (bares, restaurantes, eventos) e enriquecimento de dados.

### 1.2. Cache de Imagens (Otimização de Custos)
Para evitar custos excessivos com a API de Places Photos, implementamos um sistema de cache persistente.

**Fluxo de Funcionamento:**
1.  **Consulta Inicial**: O frontend verifica se o local já possui `image_storage_path` na tabela `locations`.
2.  **Cache Hit**: Se existir, a imagem é carregada diretamente do Supabase Storage (bucket `places`), com custo zero de API.
3.  **Cache Miss**: Se não existir, o frontend chama a Edge Function `cache-place-photo`.
4.  **Sincronização (Edge Function)**:
    -   Verifica novamente o banco de dados.
    -   Se ainda não existir, baixa a imagem da Google Places API (custo incorrido uma única vez).
    -   Faz upload da imagem para o bucket `places`.
    -   Atualiza a tabela `locations` com o caminho da imagem.
    -   Retorna a imagem para o cliente.

**Componentes Envolvidos:**
-   **Tabela**: `locations` (coluna `image_storage_path`).
-   **Storage**: Bucket `places` (público).
-   **Edge Function**: `supabase/functions/cache-place-photo`.
-   **Frontend**: `usePlacePhoto` hook e `VibeCard` component.

### 1.3. Variáveis de Ambiente
Necessárias para o funcionamento das Edge Functions:
-   `GOOGLE_MAPS_API_KEY`: Chave da API do Google com permissões para Places e Geocoding.
-   `SUPABASE_URL`: URL do projeto Supabase.
-   `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço para operações de escrita no Storage e Banco (bypass RLS).

## 2. Supabase

### 2.1. Edge Functions
-   `fetch-places-google`: Função principal de busca de locais (Google Places API V1).
-   `search-nearby`: (Legado/Alternativo) Busca de locais próximos.
-   `cache-place-photo`: Gerencia download e cache de imagens.
-   `spider-events`: Crawler para eventos (integração experimental).
-   `potential-matches`: Cálculo de compatibilidade entre usuários.

> Para detalhes profundos sobre o funcionamento, consulte [DOCUMENTACAO_TECNICA_DETALHADA.md](./DOCUMENTACAO_TECNICA_DETALHADA.md).

### 2.2. Storage Buckets
-   `places`: Armazena fotos de locais cacheadas do Google.
-   `div`: Bucket legado/genérico (mantido para compatibilidade).
-   `avatars`: Fotos de perfil dos usuários.
