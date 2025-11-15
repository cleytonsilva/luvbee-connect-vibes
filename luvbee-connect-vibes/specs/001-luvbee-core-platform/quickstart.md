# Quickstart Guide: LuvBee Core Platform

**Branch**: `001-luvbee-core-platform` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)

## Overview

Este guia fornece passos detalhados para validar manualmente cada user story da plataforma LuvBee após a implementação. Siga os passos na ordem para garantir que todas as funcionalidades estão funcionando corretamente.

## Pré-requisitos

1. **Ambiente configurado**:
   - Supabase projeto criado e configurado
   - Variáveis de ambiente configuradas (`.env`)
   - Google Places API key configurada
   - Aplicação rodando localmente (`npm run dev`)

2. **Dados de teste**:
   - Pelo menos 2 contas de usuário diferentes
   - Pelo menos 5 locais cadastrados no banco
   - Locais devem ter coordenadas válidas

---

## User Story 1: Autenticação e Onboarding Inicial

### Teste 1.1: Registro de Novo Usuário

**Objetivo**: Validar criação de conta e redirecionamento para onboarding

**Passos**:
1. Acesse a tela de registro (`/auth/register`)
2. Preencha o formulário:
   - Email: `teste1@luvbee.com`
   - Senha: `senha123`
   - Nome: `João Silva`
   - Idade: `25`
3. Clique em "Criar conta"
4. Verifique que você é redirecionado para `/onboarding`

**Resultado esperado**:
- ✅ Conta criada com sucesso
- ✅ Redirecionamento para onboarding
- ✅ Sessão autenticada ativa
- ✅ Dados do usuário salvos no banco

**Validação no banco**:
```sql
SELECT * FROM users WHERE email = 'teste1@luvbee.com';
-- Deve retornar 1 registro com onboarding_completed = false
```

---

### Teste 1.2: Completar Onboarding

**Objetivo**: Validar salvamento de preferências durante onboarding

**Passos**:
1. Na tela de onboarding (`/onboarding`)
2. Selecione preferências de drinks:
   - Cerveja
   - Vinho
   - Cocktail
3. Selecione preferências de comida:
   - Pizza
   - Hambúrguer
   - Sushi
4. Selecione preferências musicais:
   - Rock
   - Eletrônica
   - Pop
5. Clique em "Finalizar"

**Resultado esperado**:
- ✅ Preferências salvas no banco
- ✅ Redirecionamento para `/vibe-local` ou dashboard
- ✅ `onboarding_completed` atualizado para `true`

**Validação no banco**:
```sql
SELECT * FROM user_preferences WHERE user_id = '<user_id>';
-- Deve retornar 1 registro com arrays preenchidos

SELECT onboarding_completed FROM users WHERE id = '<user_id>';
-- Deve retornar true
```

---

### Teste 1.3: Login de Usuário Existente

**Objetivo**: Validar autenticação de usuário existente

**Passos**:
1. Faça logout (se estiver logado)
2. Acesse a tela de login (`/auth/login`)
3. Preencha:
   - Email: `teste1@luvbee.com`
   - Senha: `senha123`
4. Clique em "Entrar"

**Resultado esperado**:
- ✅ Login bem-sucedido
- ✅ Redirecionamento para última tela visitada ou dashboard
- ✅ Sessão autenticada ativa

---

## User Story 2: Core Loop 1 - Vibe Local (Match com Locais)

### Teste 2.1: Visualizar Locais Disponíveis

**Objetivo**: Validar exibição de locais na tela de swipe

**Pré-requisito**: Usuário autenticado e onboarding completo

**Passos**:
1. Acesse `/vibe-local`
2. Verifique que cards de locais são exibidos

**Resultado esperado**:
- ✅ Cards de locais são exibidos
- ✅ Cada card mostra: nome, foto, tipo, endereço
- ✅ Interface de swipe está funcional

**Validação no banco**:
```sql
SELECT COUNT(*) FROM locations WHERE is_active = true;
-- Deve retornar pelo menos alguns locais
```

---

### Teste 2.2: Dar Like em um Local

**Objetivo**: Validar salvamento de match com local

**Passos**:
1. Na tela `/vibe-local`
2. Deslize um card para direita (like) ou clique no botão de like
3. Verifique que o próximo local é exibido

**Resultado esperado**:
- ✅ Match salvo no banco
- ✅ Próximo local exibido automaticamente
- ✅ Feedback visual de sucesso

**Validação no banco**:
```sql
SELECT * FROM location_matches 
WHERE user_id = '<user_id>' 
ORDER BY matched_at DESC 
LIMIT 1;
-- Deve retornar o match recém-criado com status = 'active'
```

---

### Teste 2.3: Dar Dislike em um Local

**Objetivo**: Validar que dislike não cria match

**Passos**:
1. Na tela `/vibe-local`
2. Deslize um card para esquerda (dislike) ou clique no botão de dislike
3. Verifique que o próximo local é exibido

**Resultado esperado**:
- ✅ Próximo local exibido
- ✅ Nenhum match criado no banco

**Validação no banco**:
```sql
-- Não deve haver novo registro em location_matches
```

---

### Teste 2.4: Visualizar Lista de Matches com Locais

**Objetivo**: Validar exibição de matches salvos

**Passos**:
1. Após dar like em pelo menos 3 locais
2. Acesse a lista de matches (menu ou botão específico)
3. Verifique que seus matches são exibidos

**Resultado esperado**:
- ✅ Lista de matches exibida
- ✅ Locais ordenados por data de match (mais recente primeiro)
- ✅ Informações completas de cada local

---

## User Story 3: Core Loop 2 - Vibe People (Match com Pessoas)

### Teste 3.1: Acessar Vibe People sem Matches com Locais

**Objetivo**: Validar bloqueio quando não há matches com locais

**Pré-requisito**: Usuário sem matches com locais

**Passos**:
1. Faça logout e crie novo usuário
2. Complete onboarding
3. Tente acessar `/vibe-people`

**Resultado esperado**:
- ✅ Mensagem informando que é necessário dar match com locais primeiro
- ✅ Botão para redirecionar para `/vibe-local`

---

### Teste 3.2: Visualizar Pessoas com Locais em Comum

**Objetivo**: Validar filtragem por locais em comum e ordenação por compatibilidade

**Pré-requisito**: 
- Usuário 1: Autenticado com pelo menos 3 matches com locais
- Usuário 2: Autenticado com pelo menos 1 local em comum com Usuário 1

**Passos**:
1. Como Usuário 1, acesse `/vibe-people`
2. Verifique que perfis são exibidos

**Resultado esperado**:
- ✅ Apenas pessoas com locais em comum são exibidas
- ✅ Pessoas ordenadas por compatibilidade (maior primeiro)
- ✅ Badge ou indicador de compatibilidade visível
- ✅ Informações: foto, nome, idade, preferências em comum, locais em comum

**Validação no banco**:
```sql
-- Verificar que apenas usuários com location_matches em comum aparecem
SELECT DISTINCT u2.id 
FROM users u1
JOIN location_matches lm1 ON lm1.user_id = u1.id
JOIN location_matches lm2 ON lm2.location_id = lm1.location_id
JOIN users u2 ON u2.id = lm2.user_id
WHERE u1.id = '<user1_id>' AND u2.id != u1.id;
```

---

### Teste 3.3: Dar Like em uma Pessoa

**Objetivo**: Validar criação de match entre usuários

**Passos**:
1. Como Usuário 1, na tela `/vibe-people`
2. Deslize para direita (like) em um perfil
3. Verifique que o próximo perfil é exibido

**Resultado esperado**:
- ✅ Match criado no banco com status 'pending'
- ✅ Próximo perfil exibido
- ✅ Se ambos deram like, status muda para 'mutual' e chat é criado

**Validação no banco**:
```sql
SELECT * FROM people_matches 
WHERE (user1_id = '<user1_id>' AND user2_id = '<user2_id>')
   OR (user1_id = '<user2_id>' AND user2_id = '<user1_id>');
-- Deve retornar match com status 'pending' ou 'mutual'
```

---

### Teste 3.4: Match Mútuo Cria Chat Automaticamente

**Objetivo**: Validar criação automática de chat quando há match mútuo

**Pré-requisito**: 
- Usuário 1 deu like em Usuário 2
- Usuário 2 deve dar like em Usuário 1

**Passos**:
1. Como Usuário 2, acesse `/vibe-people`
2. Encontre o perfil do Usuário 1
3. Dê like no perfil
4. Verifique que um chat foi criado

**Resultado esperado**:
- ✅ Status do match muda para 'mutual'
- ✅ Chat criado automaticamente
- ✅ Ambos os usuários podem acessar o chat

**Validação no banco**:
```sql
-- Verificar match mútuo
SELECT * FROM people_matches 
WHERE (user1_id = '<user1_id>' AND user2_id = '<user2_id>')
   OR (user1_id = '<user2_id>' AND user2_id = '<user1_id>');
-- Status deve ser 'mutual' e matched_at preenchido

-- Verificar chat criado
SELECT * FROM chats 
WHERE (user1_id = '<user1_id>' AND user2_id = '<user2_id>')
   OR (user1_id = '<user2_id>' AND user2_id = '<user1_id>');
-- Deve retornar 1 chat
```

---

## User Story 4: Sistema de Chat e Conexões

### Teste 4.1: Enviar Mensagem em Tempo Real

**Objetivo**: Validar envio e recebimento de mensagens em tempo real

**Pré-requisito**: Match mútuo entre dois usuários e chat criado

**Passos**:
1. Como Usuário 1, acesse `/chat` e selecione o chat com Usuário 2
2. Digite uma mensagem: "Oi! Vi que você também curte rock 🎸"
3. Envie a mensagem
4. Como Usuário 2 (em outra aba/navegador), verifique que a mensagem aparece em tempo real

**Resultado esperado**:
- ✅ Mensagem enviada e salva no banco
- ✅ Mensagem aparece instantaneamente para Usuário 2 (< 1 segundo)
- ✅ Mensagem exibida com nome do remetente e timestamp

**Validação no banco**:
```sql
SELECT * FROM messages 
WHERE chat_id = '<chat_id>' 
ORDER BY sent_at DESC 
LIMIT 1;
-- Deve retornar a mensagem recém-enviada
```

---

### Teste 4.2: Visualizar Locais em Comum no Chat

**Objetivo**: Validar exibição de locais em comum na interface do chat

**Passos**:
1. No chat entre Usuário 1 e Usuário 2
2. Verifique se há uma seção mostrando "Locais em comum"

**Resultado esperado**:
- ✅ Seção de locais em comum exibida
- ✅ Lista de locais que ambos deram match
- ✅ Possibilidade de clicar para ver detalhes do local

---

### Teste 4.3: Status de Leitura de Mensagens

**Objetivo**: Validar atualização de status quando mensagem é lida

**Passos**:
1. Como Usuário 1, envie uma mensagem
2. Como Usuário 2, abra o chat e visualize a mensagem
3. Verifique que o status de leitura é atualizado

**Resultado esperado**:
- ✅ `read_at` preenchido no banco quando mensagem é visualizada
- ✅ Indicador visual de "lida" na interface
- ✅ Contador de não lidas atualizado

**Validação no banco**:
```sql
SELECT read_at FROM messages 
WHERE id = '<message_id>';
-- read_at deve estar preenchido após visualização
```

---

## User Story 5: Descoberta - Explorar Locais e Eventos

### Teste 5.1: Navegar por Locais Curados

**Objetivo**: Validar exibição de locais curados na tela Explorar

**Passos**:
1. Acesse `/explore`
2. Verifique que locais são exibidos organizados por categoria

**Resultado esperado**:
- ✅ Locais curados exibidos
- ✅ Organização por categoria/tipo
- ✅ Informações detalhadas de cada local

**Validação no banco**:
```sql
SELECT * FROM locations 
WHERE is_curated = true AND is_active = true;
-- Deve retornar locais curados
```

---

### Teste 5.2: Filtrar Locais

**Objetivo**: Validar filtragem de locais por tipo, localização, etc.

**Passos**:
1. Na tela `/explore`
2. Aplique filtro por tipo: "Bar"
3. Aplique filtro por localização (raio)
4. Verifique que resultados são filtrados

**Resultado esperado**:
- ✅ Filtros aplicados corretamente
- ✅ Resultados atualizados dinamicamente
- ✅ Contador de resultados exibido

---

### Teste 5.3: Ver Detalhes de um Local

**Objetivo**: Validar exibição de informações completas do local

**Passos**:
1. Na tela `/explore` ou lista de locais
2. Clique em um local para ver detalhes
3. Verifique informações exibidas

**Resultado esperado**:
- ✅ Página de detalhes exibida
- ✅ Informações completas: nome, endereço, foto, descrição, rating, horários
- ✅ Botão para dar match diretamente

---

### Teste 5.4: Dar Match Diretamente da Tela Explorar

**Objetivo**: Validar que é possível dar match sem passar pelo swipe

**Passos**:
1. Na tela de detalhes de um local (`/explore/location/:id`)
2. Clique em "Dar Match" ou botão similar
3. Verifique que o match é criado

**Resultado esperado**:
- ✅ Match criado no banco
- ✅ Feedback visual de sucesso
- ✅ Opção de continuar explorando

---

## Validação de Performance

### Teste P.1: Tempo de Carregamento Inicial

**Objetivo**: Validar SC-010 (carregamento < 3s em 4G)

**Passos**:
1. Abra DevTools → Network
2. Simule conexão 4G (throttling)
3. Recarregue a página inicial
4. Meça o tempo até carregamento completo

**Resultado esperado**:
- ✅ Tempo total < 3 segundos

---

### Teste P.2: Cálculo de Compatibilidade

**Objetivo**: Validar SC-002 (cálculo < 2s)

**Passos**:
1. Acesse `/vibe-people`
2. Meça o tempo desde o carregamento até exibição dos perfis ordenados

**Resultado esperado**:
- ✅ Perfis exibidos em < 2 segundos
- ✅ Ordenação por compatibilidade correta

---

## Checklist Final de Validação

Após completar todos os testes acima, verifique:

- [ ] Todas as User Stories P1 funcionando corretamente
- [ ] Todas as User Stories P2 funcionando corretamente
- [ ] RLS ativo e funcionando (testar acesso não autorizado)
- [ ] Validações Zod funcionando (testar inputs inválidos)
- [ ] Realtime funcionando para mensagens
- [ ] Performance dentro dos critérios definidos
- [ ] Design neo-brutalista aplicado corretamente
- [ ] Responsividade funcionando (mobile e desktop)
- [ ] Acessibilidade básica (navegação por teclado, contraste)

---

## Troubleshooting

### Problemas Comuns

**Erro de autenticação**:
- Verificar variáveis de ambiente do Supabase
- Verificar se RLS está configurado corretamente

**Mensagens não aparecem em tempo real**:
- Verificar se Realtime está habilitado no Supabase
- Verificar subscription do canal

**Locais não aparecem**:
- Verificar se há locais cadastrados no banco
- Verificar integração com Google Places API

**Compatibilidade não calculada**:
- Verificar se preferências estão preenchidas
- Verificar função de cálculo no banco

---

## Próximos Passos

Após validação bem-sucedida:
1. Documentar qualquer problema encontrado
2. Criar issues para melhorias identificadas
3. Preparar para deploy em ambiente de staging
4. Executar testes automatizados (se implementados)

