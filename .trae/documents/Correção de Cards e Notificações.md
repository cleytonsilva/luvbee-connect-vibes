# Plano de Correção e Estabilização

Para resolver o problema de carregamento de cards em `/locations` e o erro de notificações (`net::ERR_ABORTED`), faremos as seguintes correções:

## 1. Correção do `LocationService` (Crítico)
Atualizar as queries em `src/services/location.service.ts` para incluir explicitamente a coluna `image_storage_path`.
-   **Problema**: A query atual seleciona colunas específicas e omite a nova coluna de cache, impedindo o frontend de usar as imagens otimizadas.
-   **Ação**: Adicionar `image_storage_path` em `getLocations`, `getLocationsByIds` e `getUserFavorites`.

## 2. Atualização do `LocationCard`
Melhorar o componente `src/components/location/LocationCard.tsx` para usar o sistema de cache.
-   **Ação**: Implementar lógica para priorizar `image_storage_path` (Supabase Storage) sobre URLs do Google, reduzindo custos e latência.
-   **Fallback**: Manter a lógica atual como fallback.

## 3. Criação da Tabela `notifications`
Resolver o erro `net::ERR_ABORTED` criando a tabela que falta.
-   **Problema**: O frontend tenta buscar notificações, mas a tabela `notifications` não existe no banco, causando erros 400/404 que poluem o log e podem abortar conexões.
-   **Ação**: Executar o SQL de migração `20250131000002_create_notifications_table.sql` via Edge Function.

## 4. Verificações Adicionais
-   Garantir que o `LocationList` tenha tratamento de erro robusto (já verificado, mas vamos monitorar).

---

### Sequência de Execução
1.  **Backend**: Executar script SQL para criar tabela `notifications`.
2.  **Frontend (Service)**: Atualizar `LocationService.ts` com nova coluna.
3.  **Frontend (UI)**: Atualizar `LocationCard.tsx` para usar cache.
