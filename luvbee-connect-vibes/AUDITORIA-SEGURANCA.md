# Relatório de Auditoria de Segurança - LuvBee PWA
## Análise de Penetração e Vulnerabilidades

**Data:** 2025-01-28  
**Auditor:** AppSec/Pentester Sênior  
**Escopo:** Frontend React/Vite + Backend Supabase (RLS, APIs, Validações)

---

## Resumo Executivo

Esta auditoria identificou **7 vulnerabilidades críticas**, **4 vulnerabilidades de alta severidade**, **3 vulnerabilidades médias** e **2 vulnerabilidades baixas** relacionadas a políticas RLS, IDOR, XSS, exposição de chaves e validação de input.

**Status Geral:** 🔴 **CRÍTICO** - Requer ação imediata antes de produção

---

## 1. VULNERABILIDADES CRÍTICAS

### 🔴 CRIT-1: Política RLS Incompleta em `location_matches` (IDOR)

**Severidade:** CRÍTICA  
**CVSS Score:** 9.1 (Critical)

**Descrição:**
A política RLS `location_matches_select_own` está **incompleta** na migração `20250127000000_create_core_tables.sql` (linha 564-565):

```sql
CREATE POLICY "location_matches_select_own" ON public.location_matches
    FOR SELECT USING (auth.uid() = user_id);
```

**Problema:**
- A política está definida, mas **não há política DELETE** para `location_matches`
- Usuários podem potencialmente deletar matches de outros usuários se conseguirem bypassar a validação frontend
- Falta validação de que o usuário só pode ver seus próprios matches

**Evidência:**
```sql
-- Linha 564-571: Apenas SELECT, INSERT e UPDATE estão definidos
-- DELETE está ausente
```

**Impacto:**
- Usuário A pode deletar matches do Usuário B
- Corrupção de dados de matching
- Violação de privacidade

**Recomendação:**
```sql
CREATE POLICY "location_matches_delete_own" ON public.location_matches
    FOR DELETE USING (auth.uid() = user_id);
```

**Prioridade:** 🔴 **IMEDIATA**

---

### 🔴 CRIT-2: Falta de Validação Backend em `user_preferences` (IDOR)

**Severidade:** CRÍTICA  
**CVSS Score:** 8.8 (High)

**Descrição:**
O serviço `UserService.saveUserPreferences()` aceita `userId` como parâmetro do frontend sem validação adicional no backend. Embora a política RLS impeça modificações diretas, há risco se:

1. A política RLS falhar por algum motivo
2. Um atacante conseguir manipular o token JWT
3. Um bug no Supabase permitir bypass

**Evidência:**
```typescript:91:146:luvbee-connect-vibes/src/services/user.service.ts
static async saveUserPreferences(
    userId: string,  // ⚠️ Aceita userId do frontend
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> {
    try {
      const validatedData = updatePreferencesSchema.parse(preferences)
      
      const { data: upserted, error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,  // ⚠️ Sem validação de que userId === auth.uid()
          ...validatedData
        }, { onConflict: 'user_id' })
```

**Problema:**
- O `userId` vem do frontend e é usado diretamente no `upsert`
- Embora a RLS impeça, não há validação explícita no código
- Se um atacante conseguir manipular o `userId` antes da chamada, pode tentar modificar preferências de outros

**Impacto:**
- Modificação não autorizada de preferências de outros usuários
- Violação de privacidade de dados sensíveis ("vibes")

**Recomendação:**
```typescript
static async saveUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> {
    try {
      // ✅ VALIDAÇÃO CRÍTICA: Garantir que userId === auth.uid()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== userId) {
        return { error: 'Não autorizado: userId não corresponde ao usuário autenticado' }
      }
      
      const validatedData = updatePreferencesSchema.parse(preferences)
      // ... resto do código
```

**Prioridade:** 🔴 **IMEDIATA**

---

### 🔴 CRIT-3: Ausência de Sanitização XSS em Campos de Texto

**Severidade:** CRÍTICA  
**CVSS Score:** 8.5 (High)

**Descrição:**
Campos de entrada como `bio`, `name` e `content` (mensagens) não possuem sanitização explícita antes de serem salvos ou renderizados.

**Evidência:**

1. **ProfileForm.tsx** - Campo `bio`:
```typescript:494:503:luvbee-connect-vibes/src/components/profile/ProfileForm.tsx
<Textarea
  id="bio"
  value={formData.bio}
  onChange={(e) => handleInputChange('bio', e.target.value)}
  placeholder="Conte um pouco sobre você..."
  rows={4}
/>
```
- Não há sanitização antes de salvar
- React escapa HTML por padrão, mas dados salvos no banco podem conter XSS

2. **MessageService.ts** - Campo `content`:
```typescript:41:69:luvbee-connect-vibes/src/services/message.service.ts
static async sendMessage(
    chatId: string, 
    senderId: string, 
    content: string  // ⚠️ Sem sanitização
  ): Promise<ApiResponse<MessageWithRelations>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          content,  // ⚠️ Dados não sanitizados
```

**Teste de Penetração:**
```javascript
// Payload XSS para campo bio:
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">
```

**Impacto:**
- Execução de JavaScript malicioso em contexto de outros usuários
- Roubo de tokens de autenticação
- Redirecionamento para sites maliciosos
- Defacement da aplicação

**Recomendação:**
1. Instalar biblioteca de sanitização: `npm install dompurify`
2. Sanitizar antes de salvar:
```typescript
import DOMPurify from 'dompurify'

// Em ProfileForm.tsx
const sanitizedBio = DOMPurify.sanitize(formData.bio, { 
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
})

// Em MessageService.ts
const sanitizedContent = DOMPurify.sanitize(content, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href']
})
```

3. Adicionar validação Zod com sanitização:
```typescript
// Em validations.ts
export const bioSchema = z.string()
  .max(500)
  .transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
```

**Prioridade:** 🔴 **IMEDIATA**

---

### 🔴 CRIT-4: Política RLS Permissiva em `reviews` (Vazamento de Dados)

**Severidade:** CRÍTICA  
**CVSS Score:** 7.5 (High)

**Descrição:**
A política `reviews_select_public` permite que **qualquer usuário** (incluindo anônimos) leia TODAS as reviews:

```sql:640:641:luvbee-connect-vibes/supabase/migrations/20250127000000_create_core_tables.sql
CREATE POLICY "reviews_select_public" ON public.reviews
    FOR SELECT USING (TRUE);
```

**Problema:**
- Reviews podem conter informações sensíveis sobre usuários
- Não há filtro por `is_active` ou status
- Reviews deletadas ainda podem ser acessíveis

**Impacto:**
- Vazamento de informações pessoais através de reviews
- Exposição de dados de usuários que deletaram suas contas

**Recomendação:**
```sql
-- Remover política permissiva
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;

-- Criar política restritiva
CREATE POLICY "reviews_select_public" ON public.reviews
    FOR SELECT USING (
        is_active = TRUE 
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = reviews.user_id 
            AND users.is_active = TRUE
        )
    );
```

**Prioridade:** 🔴 **IMEDIATA**

---

### 🔴 CRIT-5: Validação de Input Apenas no Frontend (Zod)

**Severidade:** CRÍTICA  
**CVSS Score:** 8.0 (High)

**Descrição:**
Validações Zod existem apenas no frontend. Um atacante pode fazer requisições diretas à API do Supabase (PostgREST) bypassando completamente o frontend.

**Evidência:**
```typescript:15:22:luvbee-connect-vibes/src/lib/validations.ts
export const userRegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os Termos de Uso para criar uma conta',
  }),
})
```

**Teste de Penetração:**
```bash
# Bypass de validação de email
curl -X POST "https://[PROJECT].supabase.co/rest/v1/users" \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "name": "X", "age": 10}'
```

**Impacto:**
- Inserção de dados inválidos no banco
- Violação de constraints de negócio
- Possível corrupção de dados

**Recomendação:**
1. Criar CHECK constraints no PostgreSQL:
```sql
ALTER TABLE public.users
  ADD CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT users_name_length CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 100),
  ADD CONSTRAINT users_age_min CHECK (age >= 18);
```

2. Criar triggers de validação:
```sql
CREATE OR REPLACE FUNCTION validate_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar arrays não vazios
  IF array_length(NEW.drink_preferences, 1) IS NULL THEN
    RAISE EXCEPTION 'drink_preferences não pode estar vazio';
  END IF;
  
  -- Validar tamanho máximo
  IF array_length(NEW.drink_preferences, 1) > 10 THEN
    RAISE EXCEPTION 'Máximo de 10 preferências de bebida';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_user_preferences_trigger
  BEFORE INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_preferences();
```

**Prioridade:** 🔴 **IMEDIATA**

---

### 🔴 CRIT-6: Exposição de Chave Google Maps API no Código

**Severidade:** CRÍTICA  
**CVSS Score:** 7.0 (High)

**Descrição:**
A chave `VITE_GOOGLE_MAPS_API_KEY` está sendo usada diretamente no frontend e pode ser exposta no bundle JavaScript.

**Evidência:**
```typescript:97:97:luvbee-connect-vibes/src/hooks/useLocations.ts
return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
```

**Problema:**
- Variáveis `VITE_*` são incluídas no bundle final
- Qualquer pessoa pode inspecionar o código e extrair a chave
- Chave pode ser usada por terceiros, gerando custos

**Impacto:**
- Uso não autorizado da API Google Maps
- Custos financeiros elevados
- Possível bloqueio da chave por abuso

**Recomendação:**
1. **Mover chamadas para Edge Function do Supabase:**
```typescript
// Criar Edge Function: supabase/functions/get-place-photo/index.ts
Deno.serve(async (req) => {
  const { photoreference } = await req.json()
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
  
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoreference}&key=${apiKey}`
  )
  
  return new Response(response.body, {
    headers: { 'Content-Type': 'image/jpeg' }
  })
})
```

2. **Usar Edge Function no frontend:**
```typescript
const photoUrl = await supabase.functions.invoke('get-place-photo', {
  body: { photoreference: p.photo_reference }
})
```

3. **Restringir chave no Google Cloud Console:**
   - Limitar por domínio (ex: `app.luvbee.com`)
   - Limitar por IP (se possível)
   - Configurar quotas diárias

**Prioridade:** 🔴 **IMEDIATA**

---

### 🔴 CRIT-7: Falta de Validação de Participação em Chat (Realtime)

**Severidade:** CRÍTICA  
**CVSS Score:** 8.2 (High)

**Descrição:**
O serviço `MessageService.subscribeToMessages()` permite que qualquer usuário se inscreva em qualquer canal de Realtime, desde que conheça o `chatId`.

**Evidência:**
```typescript:266:294:luvbee-connect-vibes/src/services/message.service.ts
static subscribeToMessages(chatId: string, callback: (message: MessageWithRelations) => void) {
    return supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`  // ⚠️ Sem validação de participação
        },
```

**Problema:**
- Usuário A pode descobrir o `chatId` de uma conversa entre Usuário B e Usuário C
- Pode se inscrever no canal Realtime e receber mensagens em tempo real
- Embora a política RLS impeça leitura direta, o Realtime pode ter comportamento diferente

**Impacto:**
- Escuta não autorizada de conversas privadas
- Violação massiva de privacidade
- Possível vazamento de informações sensíveis

**Recomendação:**
1. **Validar participação antes de inscrever:**
```typescript
static async subscribeToMessages(chatId: string, userId: string, callback: (message: MessageWithRelations) => void) {
  // ✅ Validar que o usuário participa do chat
  const { data: chat, error } = await supabase
    .from('chats')
    .select('user1_id, user2_id')
    .eq('id', chatId)
    .single()
  
  if (error || (chat.user1_id !== userId && chat.user2_id !== userId)) {
    throw new Error('Não autorizado: você não participa deste chat')
  }
  
  return supabase
    .channel(`messages:${chatId}`)
    // ... resto do código
}
```

2. **Configurar RLS no Realtime:**
```sql
-- Garantir que políticas RLS se aplicam ao Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

**Prioridade:** 🔴 **IMEDIATA**

---

## 2. VULNERABILIDADES DE ALTA SEVERIDADE

### 🟠 HIGH-1: Política RLS Ausente para DELETE em `people_matches`

**Severidade:** ALTA  
**CVSS Score:** 6.5 (Medium)

**Descrição:**
A tabela `people_matches` não possui política DELETE, permitindo que usuários deletem matches de outros.

**Evidência:**
```sql:574:581:luvbee-connect-vibes/supabase/migrations/20250127000000_create_core_tables.sql
CREATE POLICY "people_matches_select_own" ON public.people_matches
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "people_matches_insert_own" ON public.people_matches
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "people_matches_update_own" ON public.people_matches
    FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
-- ⚠️ DELETE ausente
```

**Recomendação:**
```sql
CREATE POLICY "people_matches_delete_own" ON public.people_matches
    FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
```

**Prioridade:** 🟠 **ALTA**

---

### 🟠 HIGH-2: Falta de Rate Limiting em APIs

**Severidade:** ALTA  
**CVSS Score:** 6.0 (Medium)

**Descrição:**
Não há rate limiting implementado nas chamadas de API, permitindo:
- Ataques de força bruta em login
- Spam de mensagens
- Abuso de criação de locais

**Recomendação:**
1. Configurar rate limiting no Supabase Dashboard
2. Implementar rate limiting no frontend usando `react-query` com `staleTime` e `cacheTime`
3. Usar Edge Functions com rate limiting para endpoints críticos

**Prioridade:** 🟠 **ALTA**

---

### 🟠 HIGH-3: Logs de Erro Expõem Informações Sensíveis

**Severidade:** ALTA  
**CVSS Score:** 5.5 (Medium)

**Descrição:**
Logs de erro podem expor informações sensíveis como IDs de usuários, tokens parciais, etc.

**Evidência:**
```typescript:94:99:luvbee-connect-vibes/src/services/auth.service.ts
console.error('[AuthService] signUp error:', {
  message: authError.message,
  status: authError.status,
  code: authError.code,
  translated: errorMessage
})
```

**Recomendação:**
- Sanitizar logs antes de exibir
- Não logar tokens, senhas ou IDs de usuários
- Usar biblioteca de logging estruturado

**Prioridade:** 🟠 **ALTA**

---

### 🟠 HIGH-4: Validação de Idade Apenas no Frontend

**Severidade:** ALTA  
**CVSS Score:** 6.5 (Medium)

**Descrição:**
A validação de idade mínima (18 anos) existe apenas no frontend. Um atacante pode criar uma conta com idade menor fazendo requisição direta.

**Evidência:**
```typescript:29:29:luvbee-connect-vibes/src/lib/validations.ts
age: z.number().int().min(18, 'Idade mínima é 18 anos').max(120, 'Idade inválida').optional(),
```

**Recomendação:**
```sql
ALTER TABLE public.users
  ADD CONSTRAINT users_age_minimum CHECK (age >= 18);
```

**Prioridade:** 🟠 **ALTA**

---

## 3. VULNERABILIDADES MÉDIAS

### 🟡 MED-1: CORS Não Configurado Explicitamente

**Severidade:** MÉDIA  
**CVSS Score:** 4.0 (Low)

**Descrição:**
Não há configuração explícita de CORS no Supabase, dependendo das configurações padrão.

**Recomendação:**
- Configurar CORS no Supabase Dashboard
- Limitar origens permitidas apenas ao domínio da aplicação

**Prioridade:** 🟡 **MÉDIA**

---

### 🟡 MED-2: Falta de Content Security Policy (CSP)

**Severidade:** MÉDIA  
**CVSS Score:** 4.5 (Low)

**Descrição:**
Não há headers CSP configurados, permitindo potencial XSS.

**Recomendação:**
Adicionar CSP headers no `index.html` ou via servidor:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline';">
```

**Prioridade:** 🟡 **MÉDIA**

---

### 🟡 MED-3: Validação de Tamanho de Arquivo Apenas no Frontend

**Severidade:** MÉDIA  
**CVSS Score:** 5.0 (Medium)

**Descrição:**
Validação de tamanho de arquivo (5MB) existe apenas no frontend.

**Evidência:**
```typescript:181:185:luvbee-connect-vibes/src/components/profile/ProfileForm.tsx
if (file.size > 5 * 1024 * 1024) {
  toast.error('Arquivo muito grande. Máximo de 5MB permitido.')
  return
}
```

**Recomendação:**
- Configurar limite no Supabase Storage (bucket policies)
- Validar tamanho na Edge Function antes de fazer upload

**Prioridade:** 🟡 **MÉDIA**

---

## 4. VULNERABILIDADES BAIXAS

### 🟢 LOW-1: Falta de HSTS Headers

**Severidade:** BAIXA  
**CVSS Score:** 2.0 (Low)

**Recomendação:**
Configurar HSTS no servidor de produção.

**Prioridade:** 🟢 **BAIXA**

---

### 🟢 LOW-2: Versões de Dependências Não Especificadas

**Severidade:** BAIXA  
**CVSS Score:** 1.5 (Low)

**Recomendação:**
Usar versões exatas no `package.json` e fazer auditoria regular com `npm audit`.

**Prioridade:** 🟢 **BAIXA**

---

## 5. CHECKLIST DE VALIDAÇÃO - RESULTADOS

### ✅ RLS-1 (IDOR em Preferências): **PROTEGIDO** (com ressalvas)
- ✅ Política RLS existe: `user_preferences_update_own`
- ⚠️ Falta validação explícita no código (CRIT-2)

### ✅ RLS-2 (Vazamento de Dados de Match): **PROTEGIDO**
- ✅ Política `location_matches_select_own` correta
- ✅ Política `people_matches_select_own` correta
- ⚠️ Falta política DELETE (CRIT-1, HIGH-1)

### ✅ RLS-3 (Acesso a Chats Privados): **PROTEGIDO** (com ressalvas)
- ✅ Política `messages_select_own` valida participação via `chats`
- ⚠️ Falta validação no Realtime subscribe (CRIT-7)

### ✅ RLS-4 (RLS Desabilitado): **NÃO ENCONTRADO**
- ✅ Nenhum script `disable_rls_temporarily.sql` encontrado
- ✅ RLS está habilitado em todas as tabelas críticas

### ⚠️ API-1 (IDOR em Rotas): **PARCIALMENTE PROTEGIDO**
- ✅ RLS protege acesso direto
- ⚠️ Falta validação explícita no código

### ❌ XSS-1 (Chat e Perfil): **VULNERÁVEL**
- ❌ Não há sanitização de XSS (CRIT-3)
- ⚠️ React escapa por padrão, mas dados salvos podem conter XSS

### ⚠️ CFG-1 (Exposição de Chaves): **VULNERÁVEL**
- ❌ Chave Google Maps exposta no bundle (CRIT-6)

### ❌ CFG-2 (Validação de Input): **VULNERÁVEL**
- ❌ Validação apenas no frontend (CRIT-5)

---

## 6. PLANO DE REMEDIAÇÃO

### Fase 1: Correções Críticas (Imediato - 24-48h)
1. ✅ Adicionar política DELETE para `location_matches` e `people_matches`
2. ✅ Implementar sanitização XSS em todos os campos de texto
3. ✅ Adicionar validação explícita de `userId === auth.uid()` em serviços
4. ✅ Mover chave Google Maps para Edge Function
5. ✅ Adicionar CHECK constraints no PostgreSQL
6. ✅ Restringir política `reviews_select_public`
7. ✅ Validar participação em chat antes de Realtime subscribe

### Fase 2: Melhorias de Alta Prioridade (1 semana)
1. ✅ Adicionar rate limiting
2. ✅ Implementar validação backend completa
3. ✅ Sanitizar logs de erro
4. ✅ Adicionar constraint de idade mínima

### Fase 3: Melhorias de Média Prioridade (2 semanas)
1. ✅ Configurar CORS explicitamente
2. ✅ Adicionar CSP headers
3. ✅ Validar tamanho de arquivo no backend

---

## 7. CONCLUSÃO

O aplicativo LuvBee possui uma **base sólida de segurança** com políticas RLS bem implementadas na maioria das tabelas. No entanto, existem **vulnerabilidades críticas** que devem ser corrigidas **antes de qualquer deploy em produção**.

**Principais Pontos Positivos:**
- ✅ RLS habilitado em todas as tabelas críticas
- ✅ Políticas de SELECT, INSERT e UPDATE bem definidas
- ✅ Validação Zod no frontend

**Principais Pontos de Atenção:**
- ❌ Falta de sanitização XSS
- ❌ Validação apenas no frontend
- ❌ Exposição de chaves de API
- ❌ Políticas DELETE ausentes
- ❌ Falta de validação explícita de autorização no código

**Recomendação Final:** 🔴 **NÃO FAZER DEPLOY EM PRODUÇÃO** até que todas as vulnerabilidades críticas sejam corrigidas.

---

**Assinado por:** AppSec/Pentester Sênior  
**Data:** 2025-01-28

