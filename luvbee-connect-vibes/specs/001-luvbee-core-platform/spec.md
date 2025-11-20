# Feature Specification: LuvBee Core Platform

**Feature Branch**: `001-luvbee-core-platform`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "O LuvBee é um curador de 'rolês' e experiências sociais. O objetivo é resolver o problema dos 'matches mortos' (típicos do Tinder/Bumble) criando conexões que possuem contexto real através de um Match em Duas Camadas: primeiro com Locais, depois com Pessoas que deram match nos mesmos locais."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticação e Onboarding Inicial (Priority: P1)

Um novo usuário precisa criar uma conta e configurar suas preferências iniciais para que o sistema possa calcular compatibilidade e recomendar locais e pessoas relevantes.

**Why this priority**: Sem autenticação e preferências do usuário, nenhuma funcionalidade do core pode funcionar. Este é o ponto de entrada obrigatório que habilita todas as outras features.

**Independent Test**: Pode ser testado independentemente criando um novo usuário, completando o fluxo de registro e onboarding, e verificando que as preferências são salvas corretamente. O valor entregue é um perfil de usuário configurado pronto para usar o app.

**Acceptance Scenarios**:

1. **Given** um usuário não autenticado acessa o app, **When** ele preenche email e senha válidos, **Then** uma conta é criada e ele é redirecionado para o onboarding
2. **Given** um usuário recém-criado está no onboarding, **When** ele seleciona suas preferências de drinks, comidas e música, **Then** essas preferências são salvas e ele pode acessar o Core Loop 1
3. **Given** um usuário autenticado tenta acessar o app, **When** ele fornece credenciais válidas, **Then** ele é autenticado e redirecionado para a última tela visitada ou dashboard

---

### User Story 2 - Core Loop 1: Vibe Local (Match com Locais) (Priority: P1)

Um usuário autenticado precisa descobrir e dar match com locais (bares, baladas, festas, lugares inusitados) através de uma interface de swipe intuitiva, salvando seus interesses para o próximo passo do matching.

**Why this priority**: Este é o primeiro passo do Match em Duas Camadas. Sem matches com locais, não há contexto para o matching de pessoas. É fundamental para a proposta de valor do produto.

**Independent Test**: Pode ser testado independentemente após o onboarding. Um usuário autenticado deve conseguir ver locais, dar swipe (like/dislike), e verificar que seus matches são salvos. O valor entregue é uma lista de locais de interesse do usuário.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado completou o onboarding, **When** ele acessa a tela de Vibe Local, **Then** ele vê cards de locais com informações básicas (nome, foto, tipo, localização)
2. **Given** um usuário está visualizando um local, **When** ele desliza para direita (like) ou esquerda (dislike), **Then** o sistema salva a ação e mostra o próximo local
3. **Given** um usuário deu like em vários locais, **When** ele acessa sua lista de matches, **Then** ele vê todos os locais que deu match organizados por data de match
4. **Given** um usuário está visualizando locais, **When** não há mais locais disponíveis na área, **Then** o sistema informa que ele pode expandir o raio de busca ou aguardar novos locais

---

### User Story 3 - Core Loop 2: Vibe People (Match com Pessoas) (Priority: P1)

Um usuário que deu match com locais precisa ver pessoas que também deram match nos mesmos locais, filtradas por compatibilidade de preferências, e poder dar match mútuo para habilitar o chat.

**Why this priority**: Este é o segundo passo do Match em Duas Camadas e o diferencial do produto. Conecta pessoas com contexto real (locais em comum) e alta compatibilidade. Sem isso, o produto não entrega sua proposta de valor única.

**Independent Test**: Pode ser testado independentemente após ter matches com locais. Um usuário deve ver perfis filtrados por locais em comum e ranking de compatibilidade, poder dar match, e quando houver match mútuo, o chat deve ser habilitado. O valor entregue são conexões contextuais e compatíveis.

**Acceptance Scenarios**:

1. **Given** um usuário tem pelo menos um match com local, **When** ele acessa Vibe People, **Then** ele vê perfis de pessoas que deram match nos mesmos locais, ordenados por ranking de compatibilidade
2. **Given** um usuário está visualizando um perfil, **When** ele vê informações do perfil (foto, nome, idade, preferências em comum, locais em comum), **Then** ele pode dar like ou passar
3. **Given** dois usuários deram match mútuo, **When** ambos acessam suas conversas, **Then** um chat é criado automaticamente e ambos podem trocar mensagens
4. **Given** um usuário está visualizando pessoas, **When** o sistema calcula o ranking de compatibilidade, **Then** pessoas com mais preferências em comum aparecem primeiro
5. **Given** um usuário não tem matches com locais ainda, **When** ele tenta acessar Vibe People, **Then** o sistema orienta ele a primeiro dar match com locais

---

### User Story 4 - Sistema de Chat e Conexões (Priority: P2)

Usuários que deram match mútuo precisam se comunicar através de um chat em tempo real para planejar encontros e conversar sobre os locais em comum.

**Why this priority**: O chat é essencial para converter matches em conexões reais e encontros. Sem comunicação, os matches continuam sendo "mortos". Porém, depende dos matches existirem primeiro, por isso é P2.

**Independent Test**: Pode ser testado independentemente após ter um match mútuo. Dois usuários com match mútuo devem conseguir trocar mensagens em tempo real, ver status de leitura, e o chat deve mostrar informações dos locais em comum. O valor entregue é comunicação efetiva entre matches.

**Acceptance Scenarios**:

1. **Given** dois usuários têm match mútuo, **When** um deles envia uma mensagem, **Then** a mensagem aparece em tempo real para o outro usuário
2. **Given** um usuário está em uma conversa, **When** ele visualiza o perfil do match, **Then** ele vê informações do perfil e os locais em comum destacados
3. **Given** um usuário recebe uma mensagem, **When** ele está online, **Then** ele recebe notificação em tempo real
4. **Given** um usuário quer planejar um encontro, **When** ele menciona um local em comum no chat, **Then** o sistema pode sugerir informações do local ou facilitar o agendamento

---

### User Story 5 - Descoberta: Explorar Locais e Eventos (Priority: P2)

Usuários precisam descobrir novos locais e eventos curados além do fluxo de swipe, permitindo exploração ativa e descoberta de experiências sociais.

**Why this priority**: Aumenta o engajamento e oferece uma alternativa ao swipe passivo. Permite que usuários descubram locais específicos e eventos, expandindo o catálogo de matches potenciais. É complementar ao core loop, por isso P2.

**Independent Test**: Pode ser testado independentemente. Um usuário autenticado deve conseguir navegar por locais curados, filtrar por tipo/categoria, ver detalhes de eventos, e adicionar locais aos seus matches. O valor entregue é descoberta ativa de experiências.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado acessa a tela Explorar, **When** ele navega pelos locais curados, **Then** ele vê locais organizados por categoria com informações detalhadas
2. **Given** um usuário está explorando locais, **When** ele aplica filtros (tipo, localização, preço), **Then** os resultados são filtrados conforme os critérios
3. **Given** um usuário encontra um local interessante, **When** ele clica para ver detalhes, **Then** ele vê informações completas e pode dar match diretamente
4. **Given** um usuário acessa a seção de Eventos, **When** ele visualiza eventos curados, **Then** ele vê eventos futuros com data, local, descrição e pode indicar interesse

---

### Edge Cases

- **O que acontece quando um usuário não tem preferências configuradas?** O sistema deve redirecionar para completar o onboarding antes de permitir acesso aos core loops
- **Como o sistema lida com locais duplicados ou similares?** O sistema deve detectar e agrupar locais similares, evitando mostrar o mesmo local múltiplas vezes
- **O que acontece quando não há pessoas disponíveis para match em um local?** O sistema deve informar ao usuário e sugerir explorar outros locais ou aguardar
- **Como o sistema lida com usuários que dão match em muitos locais mas nenhuma pessoa?** O sistema deve otimizar o algoritmo de compatibilidade e sugerir ajustar preferências
- **O que acontece quando um local deixa de existir ou fecha?** O sistema deve marcar o local como inativo e remover de matches ativos, notificando usuários afetados
- **Como o sistema lida com spam ou comportamento inadequado no chat?** O sistema deve ter mecanismos de denúncia e moderação
- **O que acontece quando dois usuários dão match mas um deleta a conta?** O sistema deve remover o match e notificar o outro usuário
- **Como o sistema lida com mudanças nas preferências do usuário?** O sistema deve recalcular compatibilidade e atualizar rankings quando preferências mudam

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema MUST permitir criação de conta com email e senha
- **FR-002**: Sistema MUST autenticar usuários e manter sessão ativa
- **FR-003**: Sistema MUST coletar e persistir preferências do usuário durante onboarding (drinks, comidas, música)
- **FR-004**: Sistema MUST integrar com Google Places API para buscar e exibir locais
- **FR-005**: Sistema MUST permitir usuários darem like/dislike em locais através de interface de swipe
- **FR-006**: Sistema MUST salvar matches de usuários com locais na tabela location_matches
- **FR-007**: Sistema MUST calcular ranking de compatibilidade entre usuários baseado em preferências compartilhadas
- **FR-008**: Sistema MUST filtrar pessoas para match mostrando apenas aquelas que deram match nos mesmos locais
- **FR-009**: Sistema MUST ordenar pessoas por ranking de compatibilidade (maior compatibilidade primeiro)
- **FR-010**: Sistema MUST permitir usuários darem like/dislike em perfis de pessoas
- **FR-011**: Sistema MUST criar chat automaticamente quando houver match mútuo entre dois usuários
- **FR-012**: Sistema MUST permitir troca de mensagens em tempo real entre usuários com match mútuo
- **FR-013**: Sistema MUST exibir informações dos locais em comum nos chats
- **FR-014**: Sistema MUST permitir navegação por locais curados na tela de Explorar
- **FR-015**: Sistema MUST permitir filtragem de locais por tipo, localização e outros critérios
- **FR-016**: Sistema MUST exibir eventos curados com informações detalhadas
- **FR-017**: Sistema MUST aplicar Row Level Security (RLS) em todas as tabelas do banco de dados
- **FR-018**: Sistema MUST validar todos os inputs do usuário antes de processar
- **FR-019**: Sistema MUST seguir identidade visual neo-brutalista (cores magenta #ff00ff e amarelo #FFFF00, fontes Space Grotesk e Space Mono)
- **FR-020**: Sistema MUST garantir que ações principais sejam completáveis em máximo 3 cliques

### Key Entities *(include if feature involves data)*

- **User**: Representa um usuário do sistema. Atributos: id, email, senha (hash), nome, idade, foto_perfil, created_at, updated_at. Relacionamentos: tem muitas preferências (user_preferences), tem muitos matches com locais (location_matches), tem muitos matches com pessoas (people_matches), tem muitas conversas (chats)
- **UserPreferences**: Representa as preferências de um usuário. Atributos: user_id, drink_preferences (array), food_preferences (array), music_preferences (array), outros campos de vibe. Relacionamentos: pertence a um usuário (user)
- **Location**: Representa um local (bar, balada, evento). Atributos: id, nome, tipo, endereço, coordenadas (lat/lng), foto, descrição, informações do Google Places. Relacionamentos: tem muitos matches de usuários (location_matches)
- **LocationMatch**: Representa um match entre usuário e local. Atributos: user_id, location_id, matched_at, status (active/inactive). Relacionamentos: pertence a um usuário (user), pertence a um local (location)
- **PeopleMatch**: Representa um match entre dois usuários. Atributos: user1_id, user2_id, matched_at, status (pending/mutual/unmatched). Relacionamentos: pertence a dois usuários (user1, user2)
- **Chat**: Representa uma conversa entre dois usuários com match mútuo. Atributos: id, user1_id, user2_id, created_at, updated_at. Relacionamentos: pertence a dois usuários, tem muitas mensagens (messages)
- **Message**: Representa uma mensagem em um chat. Atributos: id, chat_id, sender_id, content, sent_at, read_at. Relacionamentos: pertence a um chat (chat), pertence a um remetente (user)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários podem completar registro e onboarding em menos de 5 minutos
- **SC-002**: Sistema calcula e exibe ranking de compatibilidade em menos de 2 segundos após acesso à tela Vibe People
- **SC-003**: 90% dos usuários conseguem dar match com pelo menos 3 locais na primeira sessão de uso
- **SC-004**: 80% dos matches mútuos resultam em pelo menos uma troca de mensagens no chat
- **SC-005**: Mensagens são entregues em tempo real com latência inferior a 1 segundo
- **SC-006**: Sistema suporta 10.000 usuários simultâneos sem degradação de performance
- **SC-007**: 95% das ações principais são completáveis em 3 cliques ou menos
- **SC-008**: Taxa de conversão de match com local para match com pessoa é superior a 30%
- **SC-009**: Sistema mantém disponibilidade de 99.5% do tempo
- **SC-010**: Tempo de carregamento inicial da aplicação é inferior a 3 segundos em conexão 4G

