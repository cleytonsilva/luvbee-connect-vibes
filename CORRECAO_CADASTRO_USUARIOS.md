# 🔧 Correção: Problema de Cadastro de Novos Usuários

## ❌ Problema Identificado

**Erro:** `Não autorizado: userId não corresponde ao usuário autenticado`

**Ocorrência:** Durante o processo de onboarding, quando novos usuários tentam salvar suas preferências após o cadastro.

---

## 🔍 Causa Raiz

O problema estava na validação de autorização em `UserService.saveUserPreferences()`:

1. **Problema:** Após o signup, especialmente quando o email precisa ser confirmado, há um delay na propagação da sessão do usuário
2. **Código problemático:** Usava apenas `supabase.auth.getUser()`, que pode falhar ou retornar `null` logo após o cadastro
3. **Resultado:** A validação falhava mesmo quando o usuário estava autenticado corretamente

---

## ✅ Solução Implementada

### Mudança na Validação

**Problema:** Após o signup, especialmente se o email precisa ser confirmado, a sessão pode não estar disponível imediatamente. O erro "Auth session missing!" ocorre quando `getUser()` é chamado sem sessão válida.

**Solução:** Validação flexível que:
1. Tenta obter sessão com `getSession()` primeiro
2. Se falhar, tenta `getUser()` como fallback
3. Se ambos falharem, aguarda 1 segundo e tenta novamente
4. Se ainda não houver sessão, continua mas deixa o RLS proteger
5. Trata erros de RLS com mensagem clara sobre confirmação de email

**Código implementado:**
```typescript
// Tentar obter sessão atual (mais rápido)
const { data: { session } } = await supabase.auth.getSession()
if (session?.user) {
  authenticatedUserId = session.user.id
  hasValidSession = true
} else {
  // Fallback: tentar getUser()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    authenticatedUserId = user.id
    hasValidSession = true
  }
}

// Se não há sessão válida, aguardar e tentar novamente
if (!hasValidSession) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const { data: { session: retrySession } } = await supabase.auth.getSession()
  if (retrySession?.user) {
    authenticatedUserId = retrySession.user.id
    hasValidSession = true
  }
}

// Validar apenas se tivermos sessão válida
if (hasValidSession && authenticatedUserId !== userId) {
  return { error: 'Não autorizado' }
}

// Se erro de RLS, informar sobre confirmação de email
if (upsertError.code === '42501') {
  return { error: 'Confirme seu email e tente novamente' }
}
```

### Por que isso funciona melhor?

1. **Flexível após signup:** Não bloqueia se a sessão ainda não estiver disponível
2. **Retry automático:** Aguarda 1 segundo e tenta novamente antes de desistir
3. **Mensagens claras:** Informa o usuário se precisa confirmar o email
4. **RLS como proteção:** Deixa o RLS proteger contra acesso não autorizado
5. **Logs detalhados:** Facilita debug de problemas de sessão

---

## 📋 Arquivos Modificados

- ✅ `src/services/user.service.ts` - Método `saveUserPreferences()` atualizado

---

## 🧪 Como Testar

1. **Criar uma nova conta:**
   - Acesse a página de cadastro
   - Preencha os dados e crie uma conta

2. **Completar o onboarding:**
   - Selecione preferências de música, comida, bebida, etc.
   - Clique em "Finalizar"

3. **Resultado esperado:**
   - ✅ Preferências são salvas com sucesso
   - ✅ Usuário é redirecionado para o dashboard
   - ✅ Não aparece erro "Não autorizado"

---

## 🔍 Verificação Adicional

Se o problema persistir, verifique:

1. **Sessão do usuário:**
   - Abra o DevTools > Application > Local Storage
   - Verifique se há uma entrada `luvbee-auth-token`
   - Verifique se contém dados do usuário

2. **Logs do console:**
   - Procure por logs `[UserService]` no console
   - Verifique se há erros de autenticação

3. **Configuração do Supabase:**
   - Verifique se o email confirmation está habilitado
   - Se sim, o usuário precisa confirmar o email antes de completar o onboarding

---

## ⚠️ Nota sobre Confirmação de Email

Se o Supabase estiver configurado para exigir confirmação de email:

1. **Após o cadastro:** O usuário receberá um email de confirmação
2. **Antes de confirmar:** O usuário **NÃO** conseguirá completar o onboarding porque:
   - Não há sessão válida (`auth.uid()` retorna NULL)
   - O RLS bloqueia inserção/atualização em `user_preferences`
   - A mensagem de erro será: "Confirme seu email e tente novamente"
3. **Solução:** O usuário precisa confirmar o email antes de completar o onboarding

**Onde verificar:**
- Supabase Dashboard > Authentication > Settings > Email Auth
- Verifique se "Confirm email" está habilitado
- Se estiver em desenvolvimento, considere desabilitar temporariamente

**Comportamento esperado:**
- ✅ Se confirmação de email está **desabilitada**: Onboarding funciona imediatamente após signup
- ⚠️ Se confirmação de email está **habilitada**: Usuário precisa confirmar email antes do onboarding

---

## 📝 Próximos Passos

1. ✅ Correção implementada
2. ⏳ Testar com novos usuários
3. ⏳ Monitorar logs para garantir que não há mais erros
4. ⏳ Se necessário, ajustar fluxo de confirmação de email

---

## 🆘 Se Ainda Houver Problemas

1. **Verifique os logs do console** para mensagens de erro específicas
2. **Verifique a sessão do usuário** no localStorage
3. **Teste com um usuário existente** para ver se o problema é apenas com novos usuários
4. **Verifique as políticas RLS** no Supabase para garantir que permitem inserção/atualização

---

**Última atualização:** Correção implementada e pronta para teste ✅

