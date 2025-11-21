## Pré‑requisitos
- Instalar e configurar o CLI: `npm i -g supabase`
- Fazer login: `supabase login`
- Vincular projeto (se ainda não estiver): `supabase link --project-ref <PROJECT_REF>`
- Confirmar variáveis no frontend: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local`

## Segredos (Supabase)
- Verificar se o segredo backend está presente: `GOOGLE_MAPS_BACKEND_KEY`
- Se faltar, definir: `supabase secrets set GOOGLE_MAPS_BACKEND_KEY="<SUA_CHAVE_BACKEND>"`
- Confirmar secrets: `supabase secrets list`

## Deploy das Edge Functions
- `supabase functions deploy get-place-details`
- `supabase functions deploy get-place-photo`
- `supabase functions deploy search-nearby`

## Testes via CLI (Invoke)
- `get-place-details`:
  - `supabase functions invoke get-place-details --body '{"place_id":"ChIJN1t_tDeuEmsRUsoyG83frY4","fields":["photos"]}'`
- `get-place-photo` (POST):
  - `supabase functions invoke get-place-photo --body '{"photoreference":"<PHOTO_REFERENCE>","maxwidth":400}'`
- `search-nearby`:
  - `supabase functions invoke search-nearby --body '{"latitude":-23.5505,"longitude":-46.6333,"radius":5000,"type":"night_club"}'`
- Esperado: status 200 com `data` (ou `ZERO_RESULTS`), sem `REQUEST_DENIED`

## Verificação no Dashboard
- Supabase → Functions → cada função → “Logs”
  - Confirmar chamadas OK e ausência de `referer restrictions` ou `API key not valid`

## Frontend (Validação)
- Reiniciar o servidor local após os deploys
- Abrir `/dashboard/vibe-local` e `/dashboard/locations`
  - Esperado: locais carregando, imagens nos cards
  - Console: `[DEBUG Frontend] Foto processada com sucesso` e respostas 200

## Monitoramento e Quotas
- Google Cloud Console → APIs e Serviços → Quotas da Places API
- Configurar alertas de quota se necessário

## Rollback / Re‑deploy
- Em caso de falha, reexecutar os deploys acima
- Ajustar secrets e redeploy até estabilizar