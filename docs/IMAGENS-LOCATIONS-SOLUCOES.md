## Soluções para Carregamento de Imagens em /locations

### Problemas tratados
- Google PhotoService 403: URLs antigas `PhotoService.GetPhoto` agora são bloqueadas e substituídas por placeholder, evitando chamadas diretas ao Google.
- Supabase Edge 404: Detecção de indisponibilidade e fallback imediato com cache de indisponibilidade por 5 minutos.
- Looping de chamadas e 400 em `locations`: remoção de colunas inexistentes e eliminação de buscas redundantes.

### Implementações
- Normalização de URLs
  - `src/lib/image-url-utils.ts`: converte `place/photo` para Edge `get-place-photo` e retorna placeholder para `PhotoService.GetPhoto`.
- Hook de foto com cache e fallback
  - `src/hooks/usePlacePhoto.ts`: cache em memória e `sessionStorage` (TTL 24h), guarda de requisições simultâneas, tratamento de erro com `safeLog`, flag de Edge indisponível por 5min.
- UI e estados de carregamento
  - `src/components/location/LocationCard.tsx`: overlay com `Skeleton` enquanto a imagem carrega e monitoramento de erro de `<img>`.
- Consultas `locations`
  - `src/services/location.service.ts`: remoção de `is_active`, `is_verified`, `owner_id`; `getUserLocationMatches` retorna apenas matches sem buscar detalhes.

### Monitoramento
- Uso de `safeLog` com eventos:
  - `place-photo-error` em falhas do hook
  - `image-load-error` em falhas do `<img>`

### Dependências e configuração
- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` obrigatórios.
- Edge Functions: `cache-place-photo` e `get-place-photo` devem estar implantadas em `functions/v1`.

### Troubleshooting
- 403 Google: verifique restrições de referer, quotas e habilitação da Places API e Photos.
- 404 Edge: confirme implantação, caminho correto e políticas RLS de Functions.
- Imagens não aparecem: limpe `sessionStorage` e recarregue; valide permissões do bucket `div`.

### Observações
- A chamada direta ao Google no cliente foi evitada para CORS e segurança da chave.
- A UI permanece responsiva com Skeletons e fallback imediato.