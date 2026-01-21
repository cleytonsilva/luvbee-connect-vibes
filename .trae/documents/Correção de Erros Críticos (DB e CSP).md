# Plano de Correção de Erros Críticos

Identifiquei e corrigi dois problemas críticos que estavam impedindo o funcionamento do app:

1.  **Erro no Banco de Dados (42703)**: O frontend estava tentando acessar a coluna `image_storage_path` que ainda não existe no banco de dados remoto (a migração não foi aplicada). Isso fazia com que a listagem de locais em `/vibelocal` e `/locations` retornasse vazia ou erro.
    *   **Ação Realizada**: Removi temporariamente a coluna da query em `discovery.service.ts`.
    *   **Próximo Passo (Usuário)**: Você precisará rodar o SQL de migração no painel do Supabase para criar essa coluna e habilitar o cache de imagens.

2.  **Bloqueio de CSP (Content Security Policy)**: O navegador estava bloqueando conexões para `places.googleapis.com` (Nova API do Google Places).
    *   **Ação Realizada**: Atualizei o `index.html` para permitir conexões a este domínio.

## Próximos Passos (Imediato)

1.  **Validar Correções**:
    *   Recarregar a página `/vibelocal` e verificar se os cards voltam a aparecer (agora que o erro de query foi removido).
    *   Verificar se o erro de CSP desapareceu do console.

2.  **Instruções para Habilitar Cache (Futuro)**:
    *   Para que o sistema de cache de imagens funcione conforme planejado, você precisará executar o arquivo `supabase/migrations/20251121000001_add_image_cache_columns.sql` no SQL Editor do seu projeto Supabase.
    *   Após criar a coluna, podemos reverter a alteração no `discovery.service.ts` para voltar a usar o cache.

## Resumo das Alterações
*   `src/services/discovery.service.ts`: Removido `image_storage_path` do SELECT.
*   `index.html`: Adicionado `https://places.googleapis.com` ao CSP.
