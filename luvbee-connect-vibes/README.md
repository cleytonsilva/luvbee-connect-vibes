# LuvBee Connect Vibes

Plataforma de conexão social baseada em locais e interesses comuns.

## 🎯 Status do Projeto

- ✅ **Projeto Funcional** - Código completo e testado
- ✅ **Supabase Integrado** - Backend completo configurado
- ✅ **Rotas Protegidas** - Autenticação e autorização funcionando
- ✅ **Componentes Padronizados** - UI consistente com Shadcn
- ✅ **Pronto para Deploy** - Configurado para Vercel

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# 3. Iniciar desenvolvimento
npm run dev
```

### Deploy na Vercel

Consulte o guia completo em **[DEPLOY.md](./DEPLOY.md)**

```bash
# Build de produção
npm run build

# Preview local do build
npm run preview
```

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + Shadcn UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Validação**: Zod
- **Roteamento**: React Router v6

## 📚 Documentação

- **[DEPLOY.md](./DEPLOY.md)** - Guia de deploy na Vercel
- **[CONFIGURACAO-SEGURANCA.md](./CONFIGURACAO-SEGURANCA.md)** - Configurações de segurança

## 🔧 Scripts Principais

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run preview          # Preview do build de produção
npm run lint             # Verificar código
npm run test             # Executar testes
```

## 🔒 Segurança

O projeto inclui:

- ✅ Sanitização XSS com DOMPurify
- ✅ Validação backend com CHECK constraints
- ✅ Políticas RLS no Supabase
- ✅ Headers de segurança configurados
- ✅ Content Security Policy (CSP)

## 📝 Variáveis de Ambiente

Crie um arquivo `.env.local` baseado em `.env.example`:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key (opcional)
```

**⚠️ IMPORTANTE**: Nunca commite arquivos `.env` ou `.env.local`!

## 🔗 Links Úteis

- [Dashboard Supabase](https://app.supabase.com)
- [Documentação Supabase](https://supabase.com/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [Vercel](https://vercel.com)
