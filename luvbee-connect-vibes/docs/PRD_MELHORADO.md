Aqui está o Documento de Requisitos do Produto (PRD) completo e revisado (v1.3) para o LuvBee, em formato Markdown e sem tabelas, conforme solicitado.

Este documento incorpora suas últimas revisões, incluindo o novo fluxo de onboarding (confirmação por link, preferências de identidade), a interface de "People" baseada em cards de swipe, e a adição de notificações. Ele também utiliza a documentação técnica e o Design System que você forneceu.

---

### **Documento de Requisitos do Produto (PRD): LuvBee v1.3**

### **1. Visão Geral**

#### 1.1. O Problema
O cenário de aplicativos de conexão (Tinder, Bumble) está saturado e focado em interações superficiais. Usuários (homens e mulheres) estão cansados de swipes baseados apenas em fotos e buscam conexões autênticas, enraizadas em experiências e interesses reais. Falta uma plataforma que promova a liberdade de descoberta (de locais, eventos e pessoas) e facilite encontros no mundo real com base em "vibes" compartilhadas.

#### 1.2. A Solução: LuvBee
LuvBee é um Progressive Web App (PWA) de descoberta social que revoluciona o "match". O app prioriza a conexão através de locais: os usuários primeiro dão "match" com locais (bares, festas secretas) e, subsequentemente, podem descobrir e se conectar com outras pessoas que também se interessam por esses mesmos lugares. Com um sistema de compatibilidade, chat e um "Modo Solo" flexível, o LuvBee foca em criar uma comunidade em torno de experiências autênticas e inclusivas.

#### 1.3. Público-Alvo
* **O Explorador Social (25-40 anos):** Cansado de swipes superficiais. Quer encontrar pessoas que realmente gostem dos mesmos "rolês" que ele/ela.
* **O Explorador Solo (21+ anos):** Deseja descobrir novos locais e experiências (bares, cardápios novos, entretenimento adulto) de forma independente, com foco na curadoria e privacidade.

### **2. Identidade Visual e Design System (Neo-Brutalista)**

A estética do LuvBee segue rigorosamente o `🎨 Design System - LuvBee Core Platform`.

* **Estética Central:** Neo-Brutalismo Digital.
* **Princípios:** Alto contraste, tipografia dominante, bordas pretas grossas (`border-2` ou `border-4`) e sombras duras sólidas (`shadow-hard: 4px 4px 0px #000`).
* **Paleta de Cores ("Impacto Digital"):**
    * `primary`: `#ff00ff` (Magenta - Ações principais, botões de match)
    * `accent`: `#FFFF00` (Amarelo - Destaques, tags)
    * `background`: `#f8f5f8` (Fundo claro)
    * `foreground`: `#000000` (Preto - Texto, bordas, sombras)
* **Tipografia (Google Fonts):**
    * **Títulos/Display:** **Space Grotesk** (Pesos 600-700, maiúsculas).
    * **Corpo/UI:** **Space Mono** (Peso 400, para textos e inputs).

### **3. Requisitos Funcionais (User Stories)**

#### RF-01: Onboarding e Preferências (Fluxo Revisado)
* **US-1.1:** Como novo usuário, quero poder me cadastrar de forma simples (ex: E-mail e Senha).
* **US-1.2 (Revisado):** Como novo usuário, após o cadastro, quero ser direcionado para uma tela de **"Confirme seu E-mail"**. Esta tela deve me instruir a **checar minha caixa de entrada e clicar no link de confirmação** que foi enviado. O app deve aguardar essa confirmação antes de prosseguir.
* **US-1.3:** Como novo usuário, após confirmar meu e-mail, quero ser levado a uma tela de **"Preferências de Descoberta"**, onde seleciono:
    * **"Como você se identifica?"**: Opções como "Mulher Cis", "Homem Cis", "Pessoa Não-Binária", "Outro" (Dropdown ou Radio Buttons).
    * **"Quem você quer ver?"**: Opções como "Mulheres Cis", "Homens Cis", "Público LGBTQIAPN+", "Todos" (Seleção Múltipla).
    * Meus gostos em **Bebidas, Comidas e Música** (Tags interativas `bg-accent` com `border-2 border-foreground`).
* **US-1.4:** Como novo usuário, quero que o sistema use minhas **Preferências de Descoberta** (RF-01.3) para filtrar os locais e pessoas que me serão apresentados.
* **US-1.5:** Como usuário, ao final do onboarding, quero ser solicitado a conceder permissão de GPS para que o app encontre locais próximos.

#### RF-02: "Vibe Local" (Tela Inicial de Swipe de Locais)
* **US-2.1:** Como usuário, ao abrir o app (`/dashboard/vibe-local`), quero ser apresentado imediatamente a um **Card de Local** em tela cheia, com locais filtrados pelo meu GPS e pelas minhas preferências de gostos (RF-01.3).
* **US-2.2:** Como usuário, quero poder dar "Match" (botão `primary` com ícone de caneca) ou "Dispensar" (botão `background` com "X") no local, utilizando a estética Neo-Brutalista (bordas grossas, `shadow-hard`).
* **US-2.3:** Como usuário, ao interagir (Match ou Dispensar), quero que o card atual saia da tela com uma animação "rígida" (Framer Motion) e o próximo card da fila de locais apareça.
* **US-2.4:** Como usuário, quero que os locais dispensados ("X") não apareçam novamente nesta sessão de swipe. (Ref: `LocationService.removeLocationMatch`).
* **US-2.5:** Como usuário, quero que os locais que dei "Match" sejam salvos na minha lista de "Locais Favoritos" (página `/dashboard/locations`). (Ref: `LocationService.createLocationMatch`).
* **US-2.6:** Como usuário, quero ver um botão/toggle **"Modo Solo"** claramente visível na interface da "Vibe Local" (ex: no header).
* **US-2.7:** Como usuário, ao ativar o "Modo Solo", quero que a fila de locais (US-2.6) seja imediatamente substituída por locais de entretenimento adulto, filtrados pela minha localização. (Ref: `useVibeModeStore`).

#### RF-03: "Locations" (Meus Locais Favoritos)
* **US-3.1:** Como usuário, quero ter uma página (`/dashboard/locations`) que exiba um grid de **apenas** os locais que eu dei "Match" na "Vibe Local" (RF-02.5).
* **US-3.2:** Como usuário, quero poder clicar em um local nesse grid para abrir uma "Tela de Detalhes do Local".
* **US-3.3:** Como usuário, quero que a "Tela de Detalhes do Local" contenha informações detalhadas (horários de pico, endereço, @instagram, tipo de público) e uma aba/seção chamada **"Pessoas"** (que leva ao fluxo RF-04).
* **US-3.4 (Recomendação Social):** Como usuário, se alguém que gostou de mim (RF-04.5) também deu match com um local nos "Meus Locais Favoritos", quero que esse local seja destacado (ex: borda `primary` ou um ícone especial) com a mensagem: "Alguém que gostou de você também curte este lugar. Que tal conhecer?"

#### RF-04: "People" (Match Social e Perfil Visível)
* **US-4.1:** Como usuário, quero ser informado que, para visualizar outros perfis e ser visto, preciso primeiro completar o meu (upload de 3 fotos de alta qualidade, nome e bio).
* **US-4.2 (Fluxo Revisado):** Como usuário, ao acessar a aba "Pessoas" (RF-03.3) de um local que eu curti, quero ser apresentado a uma **interface de swipe de cards** (similar à "Vibe Local", RF-02) e **não um feed ou grid**.
* **US-4.3 (Filtro de Swipe):** Como usuário, quero que a fila de swipe de pessoas (US-4.2) seja filtrada para mostrar **apenas** usuários que:
    * Também deram "Match" com aquele local.
    * Correspondem às minhas **Preferências de Descoberta** ("Quem você quer ver?", RF-01.3).
    * (Reversamente) Que eu correspondo às suas preferências.
* **US-4.4 (Perfil Visível no Card):** Como usuário, quero que cada card de perfil exiba uma visualização do perfil da pessoa, contendo:
    * Fotos, Nome e Idade.
    * **Bio** da pessoa.
    * **Locais em Comum** (ex: "Vocês dois curtiram o The Hangout Bar").
    * **Gostos em Comum** (ex: Tags `bg-accent` de "Craft Cocktails" e "Jazz").
    * Um texto claro: **"[Nome] deu match com [Nome do Local]."**
    * O **"Ranking de Compatibilidade de Rolê"**, exibido como uma porcentagem (ex: "Ela tem X% de compatibilidade com você.").
* **US-4.5 (Cálculo de Compatibilidade):** A porcentagem (X%) deve ser calculada pela RPC `calculate_compatibility_score` (baseada em preferências gerais, locais em comum, etc.).
* **US-4.6:** Como usuário, quero poder dar "Gostei" (Swipe Direita) ou "Dispensar" (Swipe Esquerda) nesses perfis.

#### RF-05: "Messages" (Chat)
* **US-5.1:** Como usuário, quero que um chat de texto (`/dashboard/messages`) seja liberado **apenas** após um "Match Mútuo" com outra pessoa (RF-04.6).
* **US-5.2:** Como usuário, quero que o chat seja em tempo real e mostre contadores de mensagens não lidas. (Ref: `subscribeToMessages`, `useChats`).
* **US-5.3:** Como usuário, quero que a interface do chat siga o design Neo-Brutalista (balões de mensagem com cantos vivos, cores `primary` e `background`, `font-mono`).

#### RF-06: "Profile" (Perfil do Usuário)
* **US-6.1:** Como usuário, quero ter uma página de Perfil (`/dashboard/profile`) onde posso editar minhas fotos (3 slots), minha bio e minhas **Preferências de Descoberta** (RF-01.3 - Identidade, Quem Ver, Gostos). (Ref: `ProfileForm`).
* **US-6.2:** Como usuário, quero que meu perfil tenha um toggle para o "Modo Solo" (RF-02.6).

#### RF-07: Notificações
* **US-7.1:** Como usuário, quero receber uma notificação (push ou no app) quando eu receber um novo "Match Mútuo" (RF-05.1).
* **US-7.2:** Como usuário, quero receber uma notificação (push ou no app) quando eu receber uma nova "Mensagem" (RF-05.2) de um match.

### **4. Arquitetura Técnica (Baseado na Documentação v1.0)**

* **Frontend:** PWA (React + Vite), Tailwind CSS (com Design System Neo-Brutalista), Framer Motion, `lucide-react`, `@react-google-maps/api`.
* **Backend:** Supabase.
* **Edge Functions (Deno):**
    * `fetch-places-google`: Busca e armazena locais.
    * `get-place-details`, `cache-place-photo`: Gerenciamento de imagens.
* **RPC Functions (PostgreSQL):**
    * `get_places_nearby`: **(Requer Refatoração)** Deve ser atualizada para aceitar as **Preferências de Gostos (RF-01.3)** do usuário como novos parâmetros de filtro, além do raio GPS e `filter_adult` para o "Modo Solo".
    * `get_potential_matches`: Núcleo da lógica "People" (RF-04). **(Requer Refatoração)** Deve filtrar perfis com base nas **Preferências de Descoberta (RF-01.3)** de ambos os usuários.
    * `create_people_match`: Executa o match mútuo e dispara o trigger de criação de chat.
    * `calculate_compatibility_score`: Lógica de pontuação (RF-04.5).
    * **Nova Tabela/RPC:** Necessária para armazenar e buscar as **Preferências de Descoberta** do usuário (identidade e quem deseja ver).

### **5. Fluxos de Usuário (Resumo v1.3)**

1.  **Onboarding:** `Usuário Abre PWA` -> `Tela de Cadastro` -> `Tela "Confirme seu E-mail"` -> `(Usuário clica no link no e-mail)` -> `Tela de Preferências de Descoberta (Identidade, Quem Ver, Gostos)` -> `Permissão GPS`.
2.  **Core Loop (Locais):** `Tela "Vibe Local" (RF-02)` -> `Vê Card de Local (filtrado por GPS + Gostos)` -> `Dá Match (Swipe Direita)`.
3.  **Modo Solo:** `Tela "Vibe Local" (RF-02)` -> `Ativa Toggle "Modo Solo"` -> `Fila de locais é substituída por entretenimento adulto`.
4.  **Core Loop (Social):** `Menu` -> `Tela "Locations" (RF-03)` -> `Clica no Local Matchado` -> `Abre aba "Pessoas" (RF-04)` -> `Vê Card de Pessoa (com Bio, Gostos, % e filtro de Preferências)` -> `Dá Match Mútuo` -> `Recebe Notificação (RF-07)` -> `Abre "Messages" (RF-05)`.

### **6. Itens Depreciados (Histórico de Versão)**

* **Página "Explore" (`/dashboard/explore`):** Esta página, anteriormente documentada como uma ferramenta de busca genérica de locais, foi **removida** da v1.3. A funcionalidade de "descoberta" está 100% focada na "Vibe Local" (RF-02) e a visualização de locais salvos está em "Locations" (RF-03). A funcionalidade de mapa com recomendação social foi movida para "Locations" (RF-03.4).

---

### **Revisão e Comparação de Fluxos (Vibe Local & Locations)**

Abaixo está a análise solicitada, comparando a visão "AS-IS" (documentação v1.0) com a nova visão "TO-BE" (PRD v1.3) para as seções `Vibe Local` e `Locations`.

#### **Página: Vibe Local (`/dashboard/vibe-local`)**

**Visão (TO-BE - PRD v1.3):**
A "Vibe Local" é a tela principal de descoberta de locais. Ela apresenta cards de locais em tela cheia, um por um, para o usuário dar "Match" ou "Dispensar". A seleção de locais é altamente personalizada, utilizando a localização GPS do usuário e suas **Preferências de Gostos (RF-01.3)**. O "Modo Solo" é um toggle proeminente nesta página, permitindo ao usuário alternar para uma curadoria de locais de entretenimento adulto.

**Comparação com Implementação "AS-IS" (Documentação v1.0):**

* **Fundação Existente:** A estrutura de `VibeLocalPage.tsx`, `LocationSwipe.tsx` e `LocationCard.tsx` já existe e está 95% completa. O hook `useVibePlaces` e a RPC `get_places_nearby` já lidam com GPS e filtro `mode`.
* **Mudança Fundamental (Filtro por Preferências):**
    * **AS-IS:** Filtra apenas por GPS e `mode` ('solo'/'normal').
    * **TO-BE:** **A RPC `get_places_nearby` precisa ser refatorada** para aceitar um array de preferências (ex: `['cocktail_bar', 'italian_food', 'electronic_music']`) como input. O `useVibePlaces` deve extrair as preferências do usuário logado e passá-las para a RPC.
    * **Ação:** Refatorar `get_places_nearby` para incluir lógica de filtragem por tags/categorias de preferências. Refatorar `useVibePlaces` para buscar e passar essas preferências.
* **Mudança Fundamental (Modo Solo):**
    * **AS-IS:** O "Modo Solo" é gerenciado internamente por `useVibeModeStore` e passado como `mode` para `useVibePlaces`. Não há um toggle proeminente na UI diretamente em `VibeLocalPage`.
    * **TO-BE:** O botão "Modo Solo" deve ser uma parte visível e interativa da interface de `VibeLocalPage` (RF-02.6).
    * **Ação:** Implementar o componente de toggle para o "Modo Solo" em `VibeLocalPage.tsx` e conectar seu estado ao `useVibeModeStore` para que o `useVibePlaces` seja re-executado.

**Resumo de Ações para "Vibe Local":**
1.  **Refatorar RPC `get_places_nearby`:** Adicionar parâmetros para filtrar por categorias/tags de preferência do usuário.
2.  **Refatorar Hook `useVibePlaces`:**
    * Buscar as preferências do usuário no perfil.
    * Passar essas preferências para a RPC `get_places_nearby`.
    * Atualizar a lógica para reagir à mudança do toggle "Modo Solo".
3.  **Refatorar UI `VibeLocalPage.tsx`:** Implementar o botão/toggle visível para o "Modo Solo".

#### **Página: Locations (`/dashboard/locations`)**

**Visão (TO-BE - PRD v1.3):**
A página "Locations" serve como o "Álbum de Favoritos" do usuário. Ela exibe um grid conciso e visualmente atraente de **todos e apenas** os locais que o usuário deu "Match" na "Vibe Local". Não é uma página de exploração ativa com filtros de busca abertos; seu propósito é revisitar locais curtidos e, a partir deles, descobrir pessoas (RF-04).

**Comparação com Implementação "AS-IS" (Documentação v1.0):**

* **Divergência Fundamental:**
    * **AS-IS:** A página `/locations` foi implementada como uma página de "Exploração" genérica (`LocationFilter`, `LocationList`) com filtros avançados, quase como um diretório de locais.
    * **TO-BE:** O novo PRD a redefine como uma página de "Meus Locais Favoritos", com foco exclusivo nos locais *matchados pelo usuário*.
* **Ações de Refatoração Críticas:**
    * **Remover `LocationFilter`:** O componente de filtros laterais e toda a lógica de filtragem por categoria, busca por texto, rating, etc., devem ser **removidos completamente** da `LocationsPage.tsx`.
    * **Alterar Fonte de Dados:** O `LocationList.tsx` (ou a `LocationsPage.tsx` diretamente) deve parar de chamar `LocationService.getLocations()` com filtros amplos. Em vez disso, deve chamar `LocationService.getUserLocationMatches(userId)` para obter apenas os locais associados ao usuário logado.
    * **Garantir a Aba "Pessoas":** O componente `LocationDetail` (modal de detalhes do local) deve ser modificado para incluir a aba "Pessoas" (RF-03.3).

**Resumo de Ações para "Locations":**
1.  **Remover Componente `LocationFilter`** e toda a sua lógica de `LocationsPage.tsx`.
2.  **Modificar `LocationsPage.tsx`:** Alterar a chamada de serviço para buscar **apenas os locais que o usuário deu "Match"** (ex: usando `LocationService.getUserLocationMatches`).
3.  **Modificar `LocationDetail`:** Garantir que este componente contenha a aba "Pessoas" (RF-04) para iniciar o fluxo social.