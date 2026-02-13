# Guia de Segurança: Protegendo sua Google Maps API Key

Este guia orienta como restringir suas chaves de API do Google Maps para evitar uso não autorizado e cobranças indevidas.

## 1. Estratégia de Chaves Separadas (Recomendado)

O código das Edge Functions (`search-nearby`, `get-place-details`) já está preparado para usar uma chave separada para o backend.

*   **Chave de Frontend (`VITE_GOOGLE_MAPS_API_KEY`)**: Usada no código React/client-side. Deve ser restrita por **HTTP Referrer**.
*   **Chave de Backend (`GOOGLE_MAPS_BACKEND_KEY`)**: Usada apenas nas Edge Functions. Deve ser restrita por **IP**.

## 2. Passo a Passo no Google Cloud Console

Acesse: [Google Cloud Console > Credentials](https://console.cloud.google.com/google/maps-apis/credentials)

### A. Configurando a Chave de Frontend

1.  Selecione a chave usada no seu app (ex: "Luvbee Frontend").
2.  Em **Application restrictions**, selecione **Websites**.
3.  Adicione seus domínios:
    *   `http://localhost:5173/*` (para desenvolvimento local)
    *   `https://seu-app.luvbee.com/*` (seu domínio de produção)
    *   `https://*.vercel.app/*` (se usar Vercel)
4.  Em **API restrictions**, selecione **Restrict key** e marque apenas:
    *   **Maps JavaScript API**
    *   **Places API** (se usada diretamente pelo cliente)

### B. Configurando a Chave de Backend (Edge Functions)

1.  Crie uma **nova chave de API** (ex: "Luvbee Backend").
2.  Em **Application restrictions**, selecione **IP addresses** (web servers, cron jobs, etc).
3.  Adicione os IPs das saídas das Supabase Edge Functions.
    *   *Nota: Como os IPs do Supabase/Deno Deploy podem variar, se não for possível restringir por IP, mantenha esta chave **secreta** e nunca a exponha no código cliente.*
4.  Em **API restrictions**, selecione **Restrict key** e marque apenas:
    *   **Places API (New)** ou **Places API**
5.  Adicione esta chave nas variáveis de ambiente do Supabase:
    ```bash
    npx supabase secrets set GOOGLE_MAPS_BACKEND_KEY=sua_nova_chave_aqui
    ```

## 3. Resumo das Correções Aplicadas no Código

Já realizamos as seguintes alterações no código para reforçar a segurança:

1.  **Validação de Autenticação (JWT)**:
    *   As funções `search-nearby` e `get-place-details` agora exigem que o usuário esteja logado.
    *   Elas verificam o header `Authorization` e validam o usuário com o Supabase Auth.
    *   Isso impede que terceiros consumam sua cota de API chamando suas Edge Functions diretamente.

2.  **Correção de Dependências**:
    *   Executamos `npm audit fix` para atualizar bibliotecas vulneráveis.

## 4. Próximos Passos para Você

1.  Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/functions) e verifique se as variáveis `GOOGLE_MAPS_API_KEY` (fallback) e `GOOGLE_MAPS_BACKEND_KEY` (preferencial) estão definidas.
2.  Aplique as restrições no Google Cloud Console conforme descrito acima.
