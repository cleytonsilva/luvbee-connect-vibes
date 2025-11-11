# 📁 Estrutura do Projeto LuvBee Connect Vibes

## 🎯 Projeto Principal

Este é o projeto funcional e atualizado onde o **Spec-Kit** está trabalhando.

## 📂 Organização de Diretórios

```
luvbee-connect-vibes/
├── 📄 Documentação Principal
│   ├── README.md                    # Documentação principal
│   ├── SPEC-KIT.md                  # Guia do Spec-Kit
│   ├── CLAUDE.md                    # Contexto para Claude Code
│   ├── COMO-RODAR.md                # Guia de execução
│   ├── PROJECT-STRUCTURE.md         # Este arquivo
│   ├── MIGRATION_GUIDE.md           # Guia de migração Supabase
│   ├── MIGRATION_CHECKLIST.md       # Checklist de migração
│   ├── SUPABASE_SETUP.md            # Setup do Supabase
│   └── SUPABASE_MANUAL_SETUP.md     # Setup manual do Supabase
│
├── 🔧 Configuração
│   ├── package.json                 # Dependências e scripts
│   ├── vite.config.ts               # Configuração Vite
│   ├── tsconfig.json                # Configuração TypeScript
│   ├── tailwind.config.ts           # Configuração TailwindCSS
│   ├── components.json              # Configuração Shadcn UI
│   └── eslint.config.js             # Configuração ESLint
│
├── 📋 Spec-Kit (Desenvolvimento Orientado por Especificações)
│   ├── .specify/                    # Templates do Spec-Kit
│   ├── specs/                       # Especificações de features
│   │   └── 001-luvbee-core-platform/
│   │       ├── spec.md              # Especificação principal
│   │       ├── plan.md              # Plano de implementação
│   │       ├── tasks.md             # Lista de tarefas
│   │       ├── data-model.md        # Modelo de dados
│   │       ├── quickstart.md        # Guia rápido
│   │       └── contracts/           # Contratos API e Zod
│   └── memory/
│       └── constitution.md          # Princípios e regras do projeto
│
├── 🗄️ Supabase (Backend)
│   ├── supabase/
│   │   ├── migrations/              # Migrações SQL
│   │   └── sql/                     # Scripts SQL adicionais
│   └── scripts/                     # Scripts de setup
│       ├── check-database.ts        # Verificar banco
│       ├── apply-migration.ts      # Aplicar migrações
│       ├── setup-storage.ts         # Configurar storage
│       └── setup-realtime.ts       # Configurar realtime
│
├── 💻 Código Fonte (src/)
│   ├── components/                  # Componentes React
│   │   ├── ui/                      # Componentes Shadcn UI
│   │   ├── auth/                    # Componentes de autenticação
│   │   ├── location/                # Componentes de locais
│   │   ├── matching/                # Componentes de matching
│   │   ├── chat/                    # Componentes de chat
│   │   ├── checkin/                 # Componentes de check-in
│   │   ├── dashboard/               # Componentes do dashboard
│   │   ├── layout/                  # Componentes de layout
│   │   └── profile/                 # Componentes de perfil
│   │
│   ├── pages/                       # Páginas da aplicação
│   │   ├── Auth.tsx                 # Página de autenticação
│   │   ├── HomePage.tsx             # Página inicial
│   │   ├── OnboardingPage.tsx       # Página de onboarding
│   │   ├── VibeLocalPage.tsx        # Página Vibe Local
│   │   ├── LocationsPage.tsx        # Página de locais
│   │   ├── PeoplePage.tsx           # Página de pessoas
│   │   ├── MessagesPage.tsx         # Página de mensagens
│   │   └── ProfilePage.tsx          # Página de perfil
│   │
│   ├── services/                    # Serviços de API
│   │   ├── auth.service.ts          # Serviço de autenticação
│   │   ├── user.service.ts          # Serviço de usuário
│   │   ├── location.service.ts      # Serviço de locais
│   │   ├── match.service.ts         # Serviço de matches
│   │   ├── message.service.ts       # Serviço de mensagens
│   │   └── google-places.service.ts # Serviço Google Places
│   │
│   ├── hooks/                       # Custom Hooks
│   │   ├── useAuth.ts               # Hook de autenticação
│   │   └── useLocations.ts          # Hook de locais
│   │
│   ├── layouts/                     # Layouts da aplicação
│   │   ├── MainLayout.tsx           # Layout principal
│   │   └── AuthLayout.tsx           # Layout de autenticação
│   │
│   ├── integrations/                # Integrações externas
│   │   ├── supabase.ts              # Cliente Supabase
│   │   └── database.types.ts        # Tipos do banco
│   │
│   ├── lib/                         # Utilitários e constantes
│   │   ├── constants.ts             # Constantes do projeto
│   │   ├── errors.ts                # Tratamento de erros
│   │   ├── validations.ts           # Validações Zod
│   │   └── utils.ts                 # Funções utilitárias
│   │
│   ├── types/                       # Tipos TypeScript
│   │   ├── app.types.ts             # Tipos principais
│   │   ├── user.types.ts            # Tipos de usuário
│   │   ├── location.types.ts        # Tipos de local
│   │   ├── match.types.ts           # Tipos de match
│   │   └── message.types.ts         # Tipos de mensagem
│   │
│   ├── test/                        # Configuração de testes
│   ├── assets/                      # Assets estáticos
│   ├── App.tsx                      # Componente raiz
│   └── main.tsx                     # Entry point
│
└── 📦 Build e Distribuição
    ├── dist/                        # Build de produção
    ├── public/                      # Arquivos públicos
    └── node_modules/                # Dependências instaladas
```

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor de desenvolvimento

# Build
npm run build            # Build de produção
npm run build:dev        # Build de desenvolvimento

# Testes
npm run test             # Executar testes
npm run test:ui          # Testes com interface
npm run test:coverage    # Cobertura de testes

# Supabase
npm run test:supabase    # Testar conexão Supabase
npm run db:check         # Verificar estado do banco
npm run db:migrate       # Aplicar migrações
npm run setup:storage    # Configurar storage
npm run setup:realtime   # Configurar realtime

# Qualidade
npm run lint             # Verificar código
```

## 📝 Convenções

### Rotas
- Todas as rotas protegidas usam prefixo `/dashboard/*`
- Rotas públicas: `/`, `/auth`, `/onboarding`
- Constantes de rotas em `lib/constants.ts`

### Componentes
- Componentes UI reutilizáveis em `components/ui/`
- Componentes de domínio em `components/{domain}/`
- Componentes de layout em `components/layout/`

### Serviços
- Todos os serviços seguem padrão `*.service.ts`
- Integração com Supabase centralizada
- Validação com Zod obrigatória

### Testes
- Testes unitários em `__tests__/`
- Configuração em `test/setup.ts`
- Cobertura mínima: 80%

## 🔗 Links Úteis

- **Spec-Kit**: `specs/001-luvbee-core-platform/`
- **Constituição**: `memory/constitution.md`
- **Documentação Supabase**: `MIGRATION_GUIDE.md`
- **Como Rodar**: `COMO-RODAR.md`

## ⚠️ Versão Antiga

A pasta `luvbee-connect-vibes-original/` contém uma versão antiga/protótipo e **NÃO deve ser usada** para desenvolvimento.

