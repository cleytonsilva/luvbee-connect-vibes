# Correção: Locais Rejeitados Não Aparecem Mais

## Problema Identificado

Quando o usuário recusava um local (clicava no X), após atualizar a página, todos os locais recusados voltavam a aparecer. Isso acontecia porque a função `filter_unmatched_locations` não estava filtrando os locais rejeitados pelo usuário específico.

## Solução Implementada

### Migração Aplicada
- **Arquivo**: `20250128000006_fix_filter_user_rejections.sql`
- **Função**: `filter_unmatched_locations`
- **Status**: ✅ Aplicada no banco de dados

### Mudanças

A função `filter_unmatched_locations` agora filtra três tipos de locais:

1. **Locais com match do usuário** (já existia)
   - Locais que o usuário já deu like

2. **Locais rejeitados pelo usuário** (NOVO)
   - Locais que o usuário específico rejeitou (clicou no X)
   - Busca na tabela `location_rejections` pelo `user_id`

3. **Locais com alta taxa de rejeição global** (já existia)
   - Locais com mais de 50% de rejeição entre todos os usuários

### Como Funciona

```sql
user_rejected_place_ids AS (
    -- Locais rejeitados pelo usuário específico
    SELECT DISTINCT
        COALESCE(l.place_id, lr.location_id) AS place_id
    FROM location_rejections lr
    LEFT JOIN locations l ON (
        lr.location_id = l.id::TEXT
        OR lr.location_id = l.place_id
    )
    WHERE lr.user_id = p_user_id
      AND (
          lr.location_id = ANY(p_place_ids)
          OR EXISTS (...)
      )
)
```

### Testes

- ✅ Locais rejeitados não aparecem mais após atualizar a página
- ✅ Rejeições são salvas corretamente na tabela `location_rejections`
- ✅ Função filtra corretamente por `user_id` e `location_id` (place_id ou UUID)

### Tabela Utilizada

**`location_rejections`**:
- `user_id`: UUID do usuário que rejeitou
- `location_id`: TEXT (pode ser UUID ou place_id do Google Places)
- `rejected_at`: Timestamp da rejeição
- Constraint UNIQUE(user_id, location_id) previne duplicatas

---

**Status**: ✅ Corrigido e funcionando  
**Data**: 2025-01-28

