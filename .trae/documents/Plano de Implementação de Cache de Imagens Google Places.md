# Implementação de Cache de Imagens do Google Places no Supabase

Este plano detalha a implementação de um sistema robusto de cache para imagens do Google Places, visando reduzir custos de API e melhorar a performance, conforme solicitado.

## 1. Banco de Dados e Storage (Supabase)

### 1.1. Migration SQL
Criar uma nova migração para:
- Adicionar a coluna `image_storage_path` (TEXT) nas tabelas `locations` e `venues`.
- Criar (ou configurar) o bucket `places` no Supabase Storage.
- Definir políticas de segurança (RLS) para permitir leitura pública do bucket `places` e escrita apenas via Service Role (Edge Function).

## 2. Edge Function: `cache-place-photo` (Atualização)

Transformar a função existente de um simples proxy para um sistema de "Fetch & Cache".

### Lógica da Nova Função:
1.  **Entrada**: Recebe `place_id` e `photo_reference`.
2.  **Verificação de Cache**:
    -   Consulta a tabela `locations` pelo `place_id`.
    -   Se `image_storage_path` existir, retorna redirecionamento (307) para a URL pública do Storage.
3.  **Busca no Google (Cache Miss)**:
    -   Se não houver imagem cacheada, busca a imagem na Google Places API (usando `photo_reference` ou buscando detalhes se necessário).
4.  **Armazenamento**:
    -   Upload do blob da imagem para o bucket `places` (caminho: `{place_id}/primary.jpg`).
    -   Atualiza a tabela `locations` (e `venues`) com o novo `image_storage_path`.
5.  **Resposta**:
    -   Retorna o binário da imagem diretamente para o cliente (para que a primeira carga seja visualizada imediatamente).

## 3. Integração Frontend

### 3.1. Hook `usePlacePhoto`
Atualizar o hook para priorizar a imagem cacheada:
-   Verificar se o objeto `location` já possui `image_storage_path`. Se sim, usar a URL do Storage diretamente.
-   Se não, manter a chamada para a Edge Function, que agora fará o cacheamento transparente ("lazy cache").

### 3.2. Componente `VibeCard`
-   Garantir que o componente receba e utilize o campo `image_storage_path` se disponível no objeto `item`.
-   Implementar a lógica de buffer/loading sequencial sugerida (opcional, mas recomendada para performance de lista).

## 4. Documentação
-   Atualizar `INTEGRACOES.md` com o fluxo de cache de imagens.
-   Documentar variáveis de ambiente necessárias.

---

### Benefícios desta Abordagem
-   **Custo Zero na 2ª Visualização**: Requisições subsequentes batem no Storage ou são redirecionadas, sem chamar a Google API.
-   **Lazy Loading**: O download da imagem do Google só ocorre quando um usuário realmente visualiza o card, evitando processar milhares de locais não vistos.
-   **Transparência**: O frontend continua pedindo uma URL, e o backend decide se entrega do cache ou busca na fonte.
