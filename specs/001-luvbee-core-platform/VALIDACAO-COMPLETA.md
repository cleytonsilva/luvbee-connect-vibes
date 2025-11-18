# ✅ Validação Completa - LuvBee Core Platform

**Data**: 2025-01-27  
**Status**: Validação Manual Completa

## 🎯 Objetivo

Validar todas as User Stories implementadas seguindo o processo completo:
1. Criar usuário fake
2. Completar onboarding
3. Dar match com locais
4. Dar match com pessoas
5. Testar chat

## 📋 Passos de Validação

### Passo 1: Criar Usuário Fake

**Via Interface Web:**
1. Acesse `http://localhost:5173/auth/register`
2. Preencha:
   - Email: `teste1@luvbee.com`
   - Senha: `senha123`
   - Nome: `João Silva`
3. Clique em "Criar conta"
4. Verifique redirecionamento para `/onboarding`

**Validação no Banco:**
```sql
SELECT id, email, name, onboarding_completed 
FROM users 
WHERE email = 'teste1@luvbee.com';
-- Deve retornar 1 registro com onboarding_completed = false
```

### Passo 2: Completar Onboarding

1. Na tela `/onboarding`
2. Selecione preferências:
   - **Drinks**: Cerveja, Vinho, Cocktail
   - **Comida**: Pizza, Hambúrguer, Sushi
   - **Música**: Rock, Eletrônica, Pop
3. Clique em "Finalizar"
4. Verifique redirecionamento para `/vibe-local`

**Validação no Banco:**
```sql
SELECT * FROM user_preferences 
WHERE user_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com');
-- Deve retornar preferências preenchidas

SELECT onboarding_completed 
FROM users 
WHERE email = 'teste1@luvbee.com';
-- Deve retornar true
```

### Passo 3: Dar Match com Locais

1. Acesse `/vibe-local`
2. Dê like em pelo menos 3 locais:
   - The Neon Lounge
   - Rock & Roll Pub
   - Sushi House
3. Verifique que próximos locais aparecem

**Validação no Banco:**
```sql
SELECT COUNT(*) 
FROM location_matches 
WHERE user_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com')
  AND status = 'active';
-- Deve retornar >= 3
```

### Passo 4: Criar Segundo Usuário e Dar Match com Locais Comuns

**Criar Usuário 2:**
1. Faça logout
2. Crie novo usuário:
   - Email: `teste2@luvbee.com`
   - Senha: `senha123`
   - Nome: `Maria Santos`
3. Complete onboarding com preferências similares
4. Dê like em locais que o Usuário 1 também curtiu:
   - The Neon Lounge
   - Rock & Roll Pub

**Validação no Banco:**
```sql
-- Verificar locais em comum
SELECT DISTINCT lm1.location_id
FROM location_matches lm1
INNER JOIN location_matches lm2 ON lm1.location_id = lm2.location_id
WHERE lm1.user_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com')
  AND lm2.user_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com')
  AND lm1.status = 'active'
  AND lm2.status = 'active';
-- Deve retornar pelo menos 2 locais em comum
```

### Passo 5: Dar Match com Pessoas

**Como Usuário 1:**
1. Acesse `/vibe-people`
2. Verifique que apenas pessoas com locais em comum aparecem
3. Verifique ordenação por compatibilidade (score maior primeiro)
4. Dê like em Maria Santos

**Validação no Banco:**
```sql
SELECT * FROM people_matches 
WHERE (user1_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com') 
   AND user2_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com'))
   OR (user1_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com') 
   AND user2_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com'));
-- Deve retornar match com status 'pending'
```

**Como Usuário 2:**
1. Faça login como `teste2@luvbee.com`
2. Acesse `/vibe-people`
3. Dê like em João Silva
4. Verifique que match muda para 'mutual' e chat é criado

**Validação no Banco:**
```sql
-- Verificar match mútuo
SELECT * FROM people_matches 
WHERE (user1_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com') 
   AND user2_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com'))
   OR (user1_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com') 
   AND user2_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com'));
-- Status deve ser 'mutual' e matched_at preenchido

-- Verificar chat criado
SELECT * FROM chats 
WHERE (user1_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com') 
   AND user2_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com'))
   OR (user1_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com') 
   AND user2_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com'));
-- Deve retornar 1 chat
```

### Passo 6: Testar Chat

**Como Usuário 1:**
1. Acesse `/messages` ou `/chat`
2. Selecione o chat com Maria Santos
3. Envie mensagem: "Oi! Vi que você também curte rock 🎸"
4. Verifique que mensagem aparece

**Como Usuário 2 (em outra aba/navegador):**
1. Faça login como `teste2@luvbee.com`
2. Acesse `/messages`
3. Verifique que mensagem aparece em tempo real (< 1 segundo)
4. Responda: "Oi! Sim, adoro rock! Você vai no Rock & Roll Pub?"
5. Verifique que mensagem aparece para Usuário 1

**Validação no Banco:**
```sql
SELECT * FROM messages 
WHERE chat_id = (
  SELECT id FROM chats 
  WHERE (user1_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com') 
     AND user2_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com'))
     OR (user1_id = (SELECT id FROM users WHERE email = 'teste2@luvbee.com') 
     AND user2_id = (SELECT id FROM users WHERE email = 'teste1@luvbee.com'))
)
ORDER BY created_at DESC;
-- Deve retornar mensagens trocadas
```

## ✅ Checklist de Validação

### User Story 1: Autenticação e Onboarding
- [ ] Registro de novo usuário funciona
- [ ] Redirecionamento para onboarding após registro
- [ ] Preferências são salvas durante onboarding
- [ ] `onboarding_completed` atualizado para `true`
- [ ] Login de usuário existente funciona

### User Story 2: Vibe Local
- [ ] Locais são exibidos na tela de swipe
- [ ] Like em local cria `location_match` com status 'active'
- [ ] Dislike não cria match
- [ ] Próximo local aparece automaticamente após like/dislike

### User Story 3: Vibe People
- [ ] Bloqueio quando não há matches com locais funciona
- [ ] Apenas pessoas com locais em comum aparecem
- [ ] Ordenação por compatibilidade funciona
- [ ] Badge de compatibilidade exibido
- [ ] Like cria `people_match` com status 'pending'
- [ ] Match mútuo muda status para 'mutual'
- [ ] Chat criado automaticamente em match mútuo

### User Story 4: Chat
- [ ] Lista de chats exibida corretamente
- [ ] Mensagens aparecem em tempo real (< 1 segundo)
- [ ] Envio de mensagens funciona
- [ ] Marcação como lida funciona
- [ ] Contadores de não lidas atualizam corretamente
- [ ] Interface responsiva funciona

## 📊 Resultados Esperados

### Performance
- ✅ Carregamento inicial < 3s
- ✅ Cálculo de compatibilidade < 2s
- ✅ Mensagens em tempo real < 1s

### Funcionalidades Core
- ✅ Match em Duas Camadas funcionando
- ✅ Filtro por locais em comum funcionando
- ✅ Cálculo de compatibilidade funcionando
- ✅ Criação automática de chat funcionando
- ✅ Realtime funcionando

## 🔍 Próximos Passos Após Validação

1. **Documentar Problemas Encontrados**
   - Criar issues para bugs encontrados
   - Documentar melhorias sugeridas

2. **Continuar Desenvolvimento**
   - User Story 5: Explorar
   - Melhorias de UX/UI
   - Otimizações de performance

3. **Preparar para Deploy**
   - Testes automatizados
   - Documentação de API
   - Guia de deploy

## 📝 Notas

- Usuários fake devem ser criados via interface web (não via SQL direto)
- Locais fake já foram criados no banco
- Validação deve ser feita manualmente seguindo os passos acima
- Documentar qualquer problema encontrado durante validação

