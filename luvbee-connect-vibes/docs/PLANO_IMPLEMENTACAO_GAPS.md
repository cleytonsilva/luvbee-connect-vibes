# 📋 Plano de Implementação - Gaps entre PRD v1.3 e Implementação Atual

**Data de Criação:** 30 de Janeiro de 2025  
**Versão:** 1.0  
**Status:** Planejamento

---

## 📌 Resumo Executivo

Este documento identifica as diferenças entre o **PRD v1.3** (visão desejada) e a **Documentação Técnica v1.0** (implementação atual), criando um plano de ação priorizado para alinhar a plataforma com a visão do produto.

### Métricas Gerais

| Categoria | PRD v1.3 | Implementação Atual | Gap |
|-----------|----------|---------------------|-----|
| **Onboarding** | 100% | 70% | 30% |
| **Vibe Local** | 100% | 85% | 15% |
| **Locations** | 100% | 40% | 60% |
| **People** | 100% | 80% | 20% |
| **Messages** | 100% | 95% | 5% |
| **Profile** | 100% | 75% | 25% |
| **Notificações** | 100% | 0% | 100% |

**Alinhamento Geral:** 65% ✅

---

## 🔍 Análise Detalhada por Funcionalidade

### 1. RF-01: Onboarding e Preferências

#### ✅ O Que Está Implementado

- ✅ Cadastro básico (email e senha)
- ✅ Página de confirmação de email (`/confirm-email`)
- ✅ Verificação automática de confirmação
- ✅ Onboarding com preferências de gostos (bebidas, comida, música)
- ✅ Permissão de GPS

#### ❌ O Que Está Faltando

**1.1. Preferências de Identidade e Descoberta**

**Gap Crítico:** O PRD v1.3 exige:
- **"Como você se identifica?"**: Opções como "Mulher Cis", "Homem Cis", "Pessoa Não-Binária", "Outro"
- **"Quem você quer ver?"**: Opções como "Mulheres Cis", "Homens Cis", "Público LGBTQIAPN+", "Todos"

**Estado Atual:**
- ❌ Não existe no banco de dados
- ❌ Não existe na UI do onboarding
- ❌ Não é usado para filtrar matches

**Impacto:** 🔴 **ALTO** - Essencial para o core do produto

**Ações Necessárias:**

1. **Criar Migration para Adicionar Campos:**
```sql
-- Adicionar campos em user_preferences
ALTER TABLE user_preferences
ADD COLUMN identity VARCHAR(50), -- 'woman_cis', 'man_cis', 'non_binary', 'other'
ADD COLUMN who_to_see TEXT[]; -- ['women_cis', 'men_cis', 'lgbtqiapn+', 'all']
```

2. **Atualizar Schema TypeScript:**
```typescript
// src/types/app.types.ts
export interface UserPreferences {
  // ... campos existentes
  identity?: 'woman_cis' | 'man_cis' | 'non_binary' | 'other'
  who_to_see?: ('women_cis' | 'men_cis' | 'lgbtqiapn+' | 'all')[]
}
```

3. **Atualizar OnboardingFlow.tsx:**
   - Adicionar step para "Preferências de Descoberta"
   - Radio buttons para identidade
   - Checkboxes múltiplos para "Quem você quer ver"
   - Validação com Zod

4. **Atualizar Validação Zod:**
```typescript
// src/lib/validations.ts
export const identitySchema = z.enum(['woman_cis', 'man_cis', 'non_binary', 'other'])
export const whoToSeeSchema = z.array(z.enum(['women_cis', 'men_cis', 'lgbtqiapn+', 'all'])).min(1)
```

**Estimativa:** 8-12 horas  
**Prioridade:** 🔴 **CRÍTICA**

---

**1.2. Filtro de Locais por Preferências de Gostos**

**Gap:** O PRD v1.3 exige que locais sejam filtrados pelas preferências de gostos do usuário (bebidas, comida, música).

**Estado Atual:**
- ✅ Preferências são coletadas no onboarding
- ❌ Não são usadas para filtrar locais em `get_places_nearby`
- ❌ `useVibePlaces` não passa preferências para a RPC

**Impacto:** 🟡 **MÉDIO** - Melhora relevância mas não bloqueia funcionalidade

**Ações Necessárias:**

1. **Refatorar RPC `get_places_nearby`:**
```sql
-- Adicionar parâmetros opcionais para filtros de preferências
CREATE OR REPLACE FUNCTION get_places_nearby(
  lat DECIMAL(10, 8),
  long DECIMAL(11, 8),
  radius_meters INTEGER DEFAULT 5000,
  filter_adult BOOLEAN DEFAULT FALSE,
  drink_preferences TEXT[] DEFAULT NULL, -- NOVO
  food_preferences TEXT[] DEFAULT NULL,  -- NOVO
  music_preferences TEXT[] DEFAULT NULL  -- NOVO
)
```

2. **Atualizar Lógica da RPC:**
   - Filtrar locais que correspondem às preferências de gostos
   - Usar operadores de array (`&&` para interseção)
   - Manter compatibilidade com chamadas antigas (parâmetros opcionais)

3. **Atualizar `useVibePlaces`:**
```typescript
// Buscar preferências do usuário
const { data: preferences } = await UserService.getUserPreferences(user.id)

// Passar para RPC
const { data } = await supabase.rpc('get_places_nearby', {
  lat: userLocation.lat,
  long: userLocation.lng,
  radius_meters: radius,
  filter_adult: mode === 'solo',
  drink_preferences: preferences?.drink_preferences || null,
  food_preferences: preferences?.food_preferences || null,
  music_preferences: preferences?.music_preferences || null
})
```

**Estimativa:** 6-8 horas  
**Prioridade:** 🟡 **MÉDIA**

---

### 2. RF-02: Vibe Local

#### ✅ O Que Está Implementado

- ✅ Interface de swipe de locais
- ✅ Cards em tela cheia
- ✅ Botões de Match/Dispensar
- ✅ Animações de transição
- ✅ Geolocalização GPS com fallback
- ✅ Modo Solo funcional (backend)
- ✅ Filtro de locais já com match

#### ❌ O Que Está Faltando

**2.1. Toggle "Modo Solo" Visível na UI**

**Gap:** O PRD v1.3 exige que o botão/toggle "Modo Solo" seja claramente visível na interface de `VibeLocalPage`.

**Estado Atual:**
- ✅ Modo Solo funciona no backend (`useVibeModeStore`)
- ❌ Não há toggle visível na UI de `VibeLocalPage`
- ⚠️ Existe em algum lugar mas não está proeminente

**Impacto:** 🟡 **MÉDIO** - Funcionalidade existe mas UX não está clara

**Ações Necessárias:**

1. **Adicionar Toggle em VibeLocalPage.tsx:**
```tsx
// No header ou sidebar da página
<div className="flex items-center gap-2">
  <Label>Modo Solo</Label>
  <Switch
    checked={soloMode}
    onCheckedChange={setSoloMode}
  />
</div>
```

2. **Conectar ao useVibeModeStore:**
```tsx
const { soloMode, setSoloMode } = useVibeModeStore()

// Quando mudar, re-executar busca
useEffect(() => {
  refresh() // Re-buscar locais com novo modo
}, [soloMode])
```

**Estimativa:** 2-3 horas  
**Prioridade:** 🟡 **MÉDIA**

---

**2.2. Filtro por Preferências de Gostos**

**Gap:** Mesmo gap do RF-01.2 - locais devem ser filtrados por preferências.

**Ações:** Ver RF-01.2 acima.

---

### 3. RF-03: Locations (Meus Locais Favoritos)

#### ✅ O Que Está Implementado

- ✅ Página `/dashboard/locations` existe
- ✅ Grid de locais
- ✅ Componente `LocationDetail` com modal
- ✅ Filtros e busca (mas não deveria ter segundo PRD)

#### ❌ O Que Está Faltando

**3.1. Redefinição: De Exploração para "Meus Favoritos"**

**Gap Crítico:** O PRD v1.3 redefine Locations como página de "Meus Locais Favoritos", mostrando **apenas** locais que o usuário deu match.

**Estado Atual:**
- ❌ Página funciona como exploração genérica
- ❌ Usa `LocationService.getLocations()` com filtros amplos
- ❌ Tem `LocationFilter` com filtros avançados
- ❌ Não filtra por matches do usuário

**Impacto:** 🔴 **ALTO** - Muda completamente o propósito da página

**Ações Necessárias:**

1. **Remover LocationFilter:**
   - Deletar ou comentar componente `LocationFilter`
   - Remover import e uso em `LocationsPage.tsx`

2. **Alterar Fonte de Dados:**
```typescript
// ANTES (atual):
const { data: locations } = await LocationService.getLocations(filter)

// DEPOIS (novo):
const { data: matches } = await LocationService.getUserLocationMatches(userId)
const locationIds = matches.map(m => m.location_id)
const { data: locations } = await LocationService.getLocationsByIds(locationIds)
```

3. **Criar Método `getLocationsByIds`:**
```typescript
// src/services/location.service.ts
static async getLocationsByIds(locationIds: string[]): Promise<ApiResponse<LocationData[]>> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .in('id', locationIds)
  
  return { data, error }
}
```

4. **Atualizar UI:**
   - Remover filtros laterais
   - Adicionar título "Meus Locais Favoritos"
   - Mostrar mensagem quando não há matches: "Você ainda não deu match com nenhum local. Explore a Vibe Local!"

**Estimativa:** 4-6 horas  
**Prioridade:** 🔴 **CRÍTICA**

---

**3.2. Aba "Pessoas" no LocationDetail**

**Gap:** O PRD v1.3 exige que `LocationDetail` tenha uma aba/seção "Pessoas" que leva ao fluxo RF-04.

**Estado Atual:**
- ✅ `LocationDetail` existe
- ❌ Não tem aba "Pessoas"
- ❌ Não conecta com PeoplePage

**Impacto:** 🟡 **MÉDIO** - Essencial para o fluxo social mas não bloqueia

**Ações Necessárias:**

1. **Adicionar Tabs em LocationDetail:**
```tsx
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Detalhes</TabsTrigger>
    <TabsTrigger value="people">Pessoas</TabsTrigger>
  </TabsList>
  <TabsContent value="details">
    {/* Detalhes atuais */}
  </TabsContent>
  <TabsContent value="people">
    <PeopleForLocation locationId={location.id} />
  </TabsContent>
</Tabs>
```

2. **Criar Componente PeopleForLocation:**
   - Similar a `PeoplePage` mas filtrado por local específico
   - Usa `get_potential_matches` com filtro adicional de local

**Estimativa:** 6-8 horas  
**Prioridade:** 🟡 **MÉDIA**

---

**3.3. Recomendação Social**

**Gap:** O PRD v1.3 exige destacar locais onde alguém que gostou de você também deu match.

**Estado Atual:**
- ❌ Não implementado
- ❌ Não há lógica para detectar isso

**Impacto:** 🟢 **BAIXO** - Feature nice-to-have

**Ações Necessárias:**

1. **Criar RPC Function:**
```sql
CREATE OR REPLACE FUNCTION get_locations_with_mutual_likes(
  p_user_id UUID
)
RETURNS TABLE (
  location_id UUID,
  mutual_like_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lm.location_id,
    COUNT(DISTINCT pm.user2_id) as mutual_like_count
  FROM location_matches lm
  INNER JOIN people_matches pm ON pm.user1_id = p_user_id
  INNER JOIN location_matches lm2 ON lm2.user_id = pm.user2_id
  WHERE lm.user_id = p_user_id
    AND lm2.location_id = lm.location_id
    AND pm.status = 'mutual'
  GROUP BY lm.location_id;
END;
$$;
```

2. **Destacar no Grid:**
   - Badge "Alguém que gostou de você também curte este lugar"
   - Borda `primary` ou ícone especial

**Estimativa:** 4-6 horas  
**Prioridade:** 🟢 **BAIXA**

---

### 4. RF-04: People (Match Social)

#### ✅ O Que Está Implementado

- ✅ Interface de swipe de pessoas
- ✅ Cards com informações do perfil
- ✅ Cálculo de compatibilidade
- ✅ Locais em comum exibidos
- ✅ Preferências exibidas
- ✅ Like/Dislike funcional
- ✅ Match mútuo detectado automaticamente

#### ❌ O Que Está Faltando

**4.1. Filtro por Preferências de Descoberta**

**Gap Crítico:** O PRD v1.3 exige filtrar pessoas por:
- "Quem você quer ver?" do usuário atual
- E que o usuário atual corresponda às preferências da pessoa

**Estado Atual:**
- ❌ `get_potential_matches` não filtra por identidade/preferências de descoberta
- ❌ Não verifica se usuário atual corresponde às preferências da pessoa

**Impacto:** 🔴 **ALTO** - Essencial para o core do produto

**Ações Necessárias:**

1. **Refatorar RPC `get_potential_matches`:**
```sql
CREATE OR REPLACE FUNCTION get_potential_matches(
  p_user_id UUID,
  match_limit INTEGER DEFAULT 10
) RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM users u
  INNER JOIN user_preferences up_current ON up_current.user_id = p_user_id
  INNER JOIN user_preferences up_target ON up_target.user_id = u.id
  WHERE 
    -- Filtro: quem o usuário atual quer ver
    (
      'all' = ANY(up_current.who_to_see) OR
      CASE up_target.identity
        WHEN 'woman_cis' THEN 'women_cis' = ANY(up_current.who_to_see)
        WHEN 'man_cis' THEN 'men_cis' = ANY(up_current.who_to_see)
        WHEN 'non_binary' THEN 'lgbtqiapn+' = ANY(up_current.who_to_see)
        ELSE TRUE
      END
    )
    -- Filtro reverso: usuário atual corresponde às preferências do target
    AND (
      'all' = ANY(up_target.who_to_see) OR
      CASE up_current.identity
        WHEN 'woman_cis' THEN 'women_cis' = ANY(up_target.who_to_see)
        WHEN 'man_cis' THEN 'men_cis' = ANY(up_target.who_to_see)
        WHEN 'non_binary' THEN 'lgbtqiapn+' = ANY(up_target.who_to_see)
        ELSE TRUE
      END
    )
    -- ... resto da lógica existente
END;
$$;
```

2. **Atualizar TypeScript Types:**
   - Garantir que `get_potential_matches` retorne campos de identidade

**Estimativa:** 8-10 horas  
**Prioridade:** 🔴 **CRÍTICA**

---

**4.2. Bio Visível no Card**

**Gap:** O PRD v1.3 exige que a bio da pessoa seja exibida no card.

**Estado Atual:**
- ⚠️ Precisa verificar se está sendo exibida
- Se não estiver, adicionar ao `PersonCard`

**Impacto:** 🟡 **MÉDIO** - Melhora informação mas não bloqueia

**Ações Necessárias:**

1. Verificar `PersonCard.tsx`
2. Se não tiver bio, adicionar:
```tsx
<p className="text-sm text-muted-foreground line-clamp-2">
  {user.bio || 'Sem bio'}
</p>
```

**Estimativa:** 1 hora  
**Prioridade:** 🟡 **MÉDIA**

---

### 5. RF-05: Messages (Chat)

#### ✅ O Que Está Implementado

- ✅ Chat em tempo real
- ✅ Contadores de não lidas
- ✅ Lista de conversas
- ✅ Interface funcional

#### ❌ O Que Está Faltando

**5.1. Design Neo-Brutalista**

**Gap:** O PRD v1.3 exige que o chat siga o design Neo-Brutalista (balões com cantos vivos, cores `primary` e `background`, `font-mono`).

**Estado Atual:**
- ⚠️ Precisa verificar se está seguindo o design system
- Provavelmente está usando design padrão

**Impacto:** 🟡 **MÉDIO** - Consistência visual

**Ações Necessárias:**

1. Verificar `MessageList.tsx` e `MessageInput.tsx`
2. Aplicar classes Neo-Brutalistas:
```tsx
// Balões de mensagem
<div className={cn(
  "rounded-none border-2 border-foreground shadow-hard",
  isOwn ? "bg-primary text-foreground" : "bg-background"
)}>
  <p className="font-mono">{message.content}</p>
</div>
```

**Estimativa:** 2-3 horas  
**Prioridade:** 🟡 **MÉDIA**

---

### 6. RF-06: Profile

#### ✅ O Que Está Implementado

- ✅ Edição de fotos (3 slots)
- ✅ Edição de bio
- ✅ Edição de preferências de gostos
- ✅ Toggle Modo Solo

#### ❌ O Que Está Faltando

**6.1. Edição de Preferências de Descoberta**

**Gap:** O PRD v1.3 exige que o usuário possa editar "Como você se identifica?" e "Quem você quer ver?" no perfil.

**Estado Atual:**
- ❌ Não existe na UI do Profile
- ❌ Campos não existem no banco (ver RF-01.1)

**Impacto:** 🟡 **MÉDIO** - Usuário precisa poder editar

**Ações Necessárias:**

1. Adicionar seção em `ProfileForm.tsx`:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Preferências de Descoberta</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <Label>Como você se identifica?</Label>
        <RadioGroup value={identity} onValueChange={setIdentity}>
          {/* Opções */}
        </RadioGroup>
      </div>
      <div>
        <Label>Quem você quer ver?</Label>
        <CheckboxGroup>
          {/* Opções múltiplas */}
        </CheckboxGroup>
      </div>
    </div>
  </CardContent>
</Card>
```

2. Salvar via `UserService.saveUserPreferences`

**Estimativa:** 4-6 horas  
**Prioridade:** 🟡 **MÉDIA**

---

### 7. RF-07: Notificações

#### ✅ O Que Está Implementado

- ❌ **Nada implementado**

#### ❌ O Que Está Faltando

**7.1. Sistema Completo de Notificações**

**Gap Crítico:** O PRD v1.3 exige notificações para:
- Novo match mútuo
- Nova mensagem

**Estado Atual:**
- ❌ Não existe sistema de notificações
- ❌ Não há integração com push notifications
- ❌ Não há notificações in-app

**Impacto:** 🔴 **ALTO** - Essencial para engajamento

**Ações Necessárias:**

1. **Configurar Supabase Realtime para Notificações:**
   - Criar tabela `notifications`
   - Configurar triggers para criar notificações

2. **Criar Tabela de Notificações:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'match_mutual', 'new_message'
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB, -- Dados adicionais (chat_id, match_id, etc.)
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. **Criar Triggers:**
```sql
-- Trigger para match mútuo
CREATE OR REPLACE FUNCTION notify_match_mutual()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'mutual' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES 
      (NEW.user1_id, 'match_mutual', 'Novo Match!', 'Você e ' || (SELECT name FROM users WHERE id = NEW.user2_id) || ' deram match!', jsonb_build_object('match_id', NEW.id, 'user_id', NEW.user2_id)),
      (NEW.user2_id, 'match_mutual', 'Novo Match!', 'Você e ' || (SELECT name FROM users WHERE id = NEW.user1_id) || ' deram match!', jsonb_build_object('match_id', NEW.id, 'user_id', NEW.user1_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_match_mutual
AFTER UPDATE ON people_matches
FOR EACH ROW
WHEN (NEW.status = 'mutual' AND OLD.status != 'mutual')
EXECUTE FUNCTION notify_match_mutual();
```

4. **Criar Hook useNotifications:**
```typescript
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  useEffect(() => {
    if (!user) return
    
    // Subscribe para novas notificações
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])
  
  return { notifications }
}
```

5. **Criar Componente NotificationBell:**
   - Badge com contador
   - Dropdown com lista de notificações
   - Marcar como lido ao clicar

6. **Integrar Push Notifications (opcional):**
   - Service Worker
   - Permissão do navegador
   - Envio via Supabase Edge Function

**Estimativa:** 16-24 horas  
**Prioridade:** 🔴 **CRÍTICA**

---

### 8. Página Explore (Depreciada)

#### ⚠️ Status no PRD

**PRD v1.3:** A página `/dashboard/explore` foi **removida** da v1.3.

**Estado Atual:**
- ✅ Página existe e está funcional (85%)
- ✅ Documentada na documentação técnica

**Ações Necessárias:**

1. **Decisão:** Manter ou remover?
   - Se remover: Deletar arquivos e rotas
   - Se manter: Documentar como feature adicional não no PRD

**Estimativa:** 1-2 horas (se remover)  
**Prioridade:** 🟢 **BAIXA**

---

## 📊 Plano de Ação Priorizado

### 🔴 Prioridade CRÍTICA (Bloqueia Core Features)

| # | Tarefa | Estimativa | Dependências |
|---|--------|------------|--------------|
| 1 | **RF-01.1:** Adicionar Preferências de Identidade e Descoberta | 8-12h | Migration, Schema, UI |
| 2 | **RF-04.1:** Filtrar People por Preferências de Descoberta | 8-10h | RF-01.1 |
| 3 | **RF-03.1:** Redefinir Locations como "Meus Favoritos" | 4-6h | Nenhuma |
| 4 | **RF-07.1:** Sistema de Notificações | 16-24h | Tabela, Triggers, UI |

**Total Crítico:** 36-52 horas

### 🟡 Prioridade MÉDIA (Melhora UX e Funcionalidade)

| # | Tarefa | Estimativa | Dependências |
|---|--------|------------|--------------|
| 5 | **RF-01.2:** Filtrar Locais por Preferências de Gostos | 6-8h | RF-01.1 |
| 6 | **RF-02.1:** Toggle Modo Solo Visível na UI | 2-3h | Nenhuma |
| 7 | **RF-03.2:** Aba "Pessoas" no LocationDetail | 6-8h | RF-04.1 |
| 8 | **RF-04.2:** Bio Visível no PersonCard | 1h | Nenhuma |
| 9 | **RF-05.1:** Design Neo-Brutalista no Chat | 2-3h | Nenhuma |
| 10 | **RF-06.1:** Editar Preferências de Descoberta no Profile | 4-6h | RF-01.1 |

**Total Médio:** 21-29 horas

### 🟢 Prioridade BAIXA (Nice-to-Have)

| # | Tarefa | Estimativa | Dependências |
|---|--------|------------|--------------|
| 11 | **RF-03.3:** Recomendação Social em Locations | 4-6h | RF-07.1 |
| 12 | **Remover/Manter Página Explore** | 1-2h | Nenhuma |

**Total Baixo:** 5-8 horas

---

## 📅 Roadmap Sugerido

### Sprint 1 (Semana 1-2): Fundação Crítica
- ✅ RF-01.1: Preferências de Identidade e Descoberta
- ✅ RF-04.1: Filtrar People por Preferências
- ✅ RF-03.1: Redefinir Locations

**Duração:** 2 semanas  
**Esforço:** 20-28 horas

### Sprint 2 (Semana 3-4): Notificações e Melhorias
- ✅ RF-07.1: Sistema de Notificações
- ✅ RF-01.2: Filtrar Locais por Preferências
- ✅ RF-02.1: Toggle Modo Solo

**Duração:** 2 semanas  
**Esforço:** 24-35 horas

### Sprint 3 (Semana 5-6): Finalizações
- ✅ RF-03.2: Aba Pessoas
- ✅ RF-04.2: Bio no Card
- ✅ RF-05.1: Design Chat
- ✅ RF-06.1: Editar Preferências

**Duração:** 2 semanas  
**Esforço:** 13-18 horas

### Sprint 4 (Semana 7): Polish
- ✅ RF-03.3: Recomendação Social
- ✅ Decisão sobre Explore

**Duração:** 1 semana  
**Esforço:** 5-8 horas

---

## 🎯 Métricas de Sucesso

### Alinhamento com PRD
- **Atual:** 65%
- **Meta:** 95%+
- **Gap:** 30%

### Funcionalidades Core
- **Onboarding:** 70% → 100%
- **Vibe Local:** 85% → 100%
- **Locations:** 40% → 100%
- **People:** 80% → 100%
- **Messages:** 95% → 100%
- **Profile:** 75% → 100%
- **Notificações:** 0% → 100%

---

## 📝 Notas Importantes

1. **Dependências entre Tarefas:**
   - RF-01.1 é pré-requisito para RF-04.1, RF-01.2, RF-06.1
   - RF-04.1 é pré-requisito para RF-03.2
   - RF-07.1 pode ser feito em paralelo mas ajuda RF-03.3

2. **Riscos:**
   - Migrations podem quebrar dados existentes (fazer backup)
   - Mudanças em RPC functions podem afetar performance (testar)
   - Notificações requerem configuração adicional do Supabase

3. **Testes Necessários:**
   - Testar filtros de preferências com diferentes combinações
   - Testar notificações em tempo real
   - Testar fluxo completo de onboarding com novas preferências

---

**Última Atualização:** 30 de Janeiro de 2025  
**Próxima Revisão:** Após Sprint 1

