# LuvBee Connect Vibes

Plataforma de conexão social baseada em locais e interesses comuns.

## 🎯 Status do Projeto

- ✅ **Projeto Funcional** - Código completo e testado
- ✅ **Spec-Kit Ativo** - Desenvolvimento orientado por especificações
- ✅ **Supabase Integrado** - Backend completo configurado
- ✅ **Rotas Protegidas** - Autenticação e autorização funcionando
- ✅ **Componentes Padronizados** - UI consistente com Shadcn

## 📁 Estrutura do Projeto

```
luvbee-connect-vibes/          ← PROJETO PRINCIPAL (Use esta pasta!)
├── specs/                     ← Spec-Kit trabalhando aqui
├── supabase/                  ← Migrações e scripts SQL
├── src/                       ← Código fonte completo
└── ...

luvbee-connect-vibes-original/ ← VERSÃO ANTIGA (Não usar!)
└── README-OLD-VERSION.md      ← Explicação da versão antiga
```

**⚠️ IMPORTANTE**: Use sempre `luvbee-connect-vibes/` para desenvolvimento!

## 🚀 Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# 3. Verificar banco de dados
npm run db:check

# 4. Iniciar desenvolvimento
npm run dev
```

## 📚 Documentação

- **[PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md)** - Estrutura detalhada do projeto
- **[COMO-RODAR.md](./COMO-RODAR.md)** - Guia completo de execução
- **[SPEC-KIT.md](./SPEC-KIT.md)** - Guia do Spec-Kit
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guia de migração Supabase

## 🔧 Scripts Disponíveis

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run test             # Executar testes
npm run db:check         # Verificar banco de dados
npm run db:migrate       # Aplicar migrações
npm run setup:storage    # Configurar storage Supabase
npm run setup:realtime   # Configurar realtime Supabase
```

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + Shadcn UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Testes**: Vitest + React Testing Library
- **Validação**: Zod
- **Roteamento**: React Router v6

## 📋 Spec-Kit

O projeto segue **Spec-Driven Development**:

- Especificações: `specs/001-luvbee-core-platform/spec.md`
- Plano: `specs/001-luvbee-core-platform/plan.md`
- Tarefas: `specs/001-luvbee-core-platform/tasks.md`
- Constituição: `memory/constitution.md`

## 🔗 Links Úteis

- [Dashboard Supabase](https://app.supabase.com/project/zgxtcawgllsnnernlgim)
- [Documentação Supabase](https://supabase.com/docs)
- [Shadcn UI](https://ui.shadcn.com)

## ⚠️ Versão Antiga

A pasta `luvbee-connect-vibes-original/` contém uma versão antiga/protótipo e **NÃO deve ser usada** para desenvolvimento. Veja `luvbee-connect-vibes-original/README-OLD-VERSION.md` para mais detalhes.
