# Correções Adicionais - Continuação

## Data: 2025-11-10

---

## ✅ Correções Adicionais Implementadas

### 1. Política RLS de UPDATE para Users ✅

**Problema:**
- Política de UPDATE pode não estar permitindo atualização de `onboarding_completed`
- TC001 falha ao tentar atualizar `onboarding_completed = true`

**Correção:**
- ✅ Política `users_update_own` recriada para garantir que usuários possam atualizar seus próprios dados
- ✅ Política permite atualizar qualquer campo do próprio perfil, incluindo `onboarding_completed`

**Migração Aplicada:**
- `fix_users_update_policy_for_onboarding`

### 2. Função RPC get_recent_conversations Corrigida ✅

**Problema:**
- Função estava tentando acessar `u.avatar_url` que não existe na tabela `users`
- Erro: `column u.avatar_url does not exist`

**Correção:**
- ✅ Função corrigida para retornar `NULL` para `avatar_url` ao invés de tentar acessar coluna inexistente
- ✅ Função testada e funcionando corretamente

**Migração Aplicada:**
- `fix_get_recent_conversations_avatar_url`

**Estrutura da Tabela users:**
- Colunas existentes: `id`, `email`, `name`, `age`, `bio`, `photos`, `location`, `preferences`, `created_at`, `updated_at`, `is_active`, `onboarding_completed`
- **Não possui:** `avatar_url` (pode estar em outra tabela como `profiles`)

---

## 📊 Status das Correções

### Backend ✅
- ✅ Política RLS de UPDATE corrigida
- ✅ Função `get_recent_conversations` corrigida
- ✅ Função testada e funcionando

### Problemas Restantes

1. **RLS Durante Onboarding (TC001)**
   - **Status:** Políticas corrigidas, mas pode haver problema com a função `handle_new_user`
   - **Ação:** A função `handle_new_user` está usando `SECURITY DEFINER`, então deveria funcionar
   - **Recomendação:** Verificar se o erro está ocorrendo durante INSERT ou UPDATE

2. **Geolocation Permission**
   - **Status:** Limitação de testes automatizados
   - **Ação:** Implementar mock location para testes (opcional)

---

## 🔍 Análise do Problema TC001

### Erro Reportado:
```
[ERROR] [AuthService] profile creation error: {code: 42501, message: new row violates row-level security policy for table "users"}
[ERROR] Failed to load resource: the server responded with a status of 401 () (user_preferences table)
```

### Possíveis Causas:

1. **Função handle_new_user não está sendo executada**
   - Verificar se o trigger está ativo
   - Verificar se a função está sendo chamada corretamente

2. **Política de INSERT muito restritiva**
   - Política atual: `users_insert_via_signup` com `WITH CHECK (auth.uid() = id)`
   - Isso deveria funcionar se `handle_new_user` está usando `SECURITY DEFINER`

3. **Problema com user_preferences**
   - Erro 401 indica problema de autenticação
   - Pode ser que o usuário não esteja autenticado quando tenta inserir

### Recomendações:

1. **Verificar Trigger:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Testar Função handle_new_user:**
   ```sql
   -- Verificar se a função está sendo executada corretamente
   ```

3. **Verificar Políticas RLS:**
   - As políticas parecem corretas
   - Pode ser necessário verificar se há conflito entre políticas

---

## 📝 Próximos Passos

### Imediato

1. ✅ **Concluído:** Política RLS de UPDATE corrigida
2. ✅ **Concluído:** Função `get_recent_conversations` corrigida
3. ⏳ **Pendente:** Investigar problema de RLS durante onboarding (TC001)

### Curto Prazo

4. **Verificar Trigger handle_new_user:**
   - Confirmar que está ativo
   - Testar execução manual

5. **Re-executar Testes:**
   - Após todas as correções
   - Focar em TC001, TC009, TC015

---

## ✅ Checklist de Correções Adicionais

- [x] Política RLS de UPDATE corrigida
- [x] Função `get_recent_conversations` corrigida (avatar_url)
- [x] Função testada e funcionando
- [ ] Problema de RLS durante onboarding investigado
- [ ] Trigger handle_new_user verificado

---

**Status:** ✅ **Correções Adicionais Implementadas**

**Próxima Ação:** Investigar problema de RLS durante onboarding e verificar trigger

