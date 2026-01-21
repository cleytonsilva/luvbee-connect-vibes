Vou implementar as correções solicitadas focando no layout responsivo e na conformidade com a API do Google Places.

### 1. Correção de Layout ("3 logs" e "div")
O problema de sobreposição ocorre porque os componentes `VibeCard` e `LocationCard` possuem uma altura fixa de `h-[80vh]`, que estoura o container flexível em telas menores, causando sobreposição com os controles inferiores (o "div").

*   **Ação em `VibeLocalPage.tsx`:** Manter a estrutura Flexbox (`flex-col`), garantindo que o container central (`flex-1`) ocupe apenas o espaço disponível entre as abas (topo) e os controles (fundo).
*   **Ação em `VibeCard.tsx` e `LocationCard.tsx`:** Alterar a altura de `h-[80vh]` para `h-full`. Isso fará com que o card respeite o tamanho do container pai, eliminando a sobreposição e garantindo o alinhamento e espaçamento (gap) corretos em todos os breakpoints.

### 2. Integração com Google Places Photos API
Atualizarei as Edge Functions e Hooks para seguir estritamente a documentação, distinguindo entre a API V1 (New) e a Legacy.

*   **`supabase/functions/get-place-photo/index.ts` e `cache-place-photo/index.ts`:**
    *   **V1 (New):** Quando `photo_reference` começar com `places/`.
        *   URL: `https://places.googleapis.com/v1/{name}/media`
        *   Parâmetros: `maxHeightPx`, `maxWidthPx`.
    *   **Legacy:** Quando for um token opaco.
        *   URL: `https://maps.googleapis.com/maps/api/place/photo`
        *   Parâmetros: `maxheight`, `maxwidth` (Adicionar `maxheight` que estava faltando).

### 3. Tratamento de Imagens e Fallbacks
*   **Verificação:** O componente `LocationCard` já possui `onError`, mas reforçarei a lógica para garantir que imagens quebradas ou URLs inválidas caiam graciosamente para o placeholder, evitando espaços vazios.

### Arquivos Afetados
*   `src/pages/VibeLocalPage.tsx`
*   `src/components/location/VibeCard.tsx`
*   `src/components/location/LocationCard.tsx`
*   `supabase/functions/get-place-photo/index.ts`
*   `supabase/functions/cache-place-photo/index.ts`
