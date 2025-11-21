# 🚀 Guia Completo de Deploy na Vercel

Este guia passo a passo vai te ajudar a fazer o deploy do LuvBee Connect Vibes na Vercel.

## 📋 Pré-requisitos

- ✅ Conta na Vercel ([criar conta](https://vercel.com/signup))
- ✅ Projeto Supabase configurado
- ✅ Credenciais do Supabase disponíveis
- ✅ Node.js e npm instalados

## 🎯 Método 1: Deploy via CLI (Recomendado)

### Passo 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Fazer Login na Vercel

```bash
vercel login
```

Isso abrirá seu navegador para autenticação. Após fazer login, volte ao terminal.

### Passo 3: Executar Script de Deploy

```powershell
# Windows PowerShell
.\deploy-vercel.ps1
```

Ou execute manualmente:

```bash
# Criar build de produção
npm run build

# Fazer deploy
vercel --prod
```

### Passo 4: Configurar Variáveis de Ambiente

Após o primeiro deploy, configure as variáveis de ambiente:

**Opção A: Via Dashboard (Recomendado)**
1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-maps (opcional)
```

**Opção B: Via CLI**

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_GOOGLE_MAPS_API_KEY production
```

### Passo 5: Fazer Redeploy

Após configurar as variáveis, faça um novo deploy:

```bash
vercel --prod
```

## 🎯 Método 2: Deploy via GitHub (Recomendado para Produção)

### Passo 1: Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Add New Project**
3. Conecte seu repositório GitHub/GitLab/Bitbucket
4. Selecione o projeto `Luvbee2`

### Passo 2: Configurar Projeto

A Vercel detectará automaticamente:
- ✅ Framework: Vite
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Install Command: `npm install`

### Passo 3: Configurar Variáveis de Ambiente

No painel de configuração, adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-maps (opcional)
VITE_APP_ENV=production
```

**⚠️ IMPORTANTE**: 
- Configure para **Production**, **Preview** e **Development**
- Use o mesmo valor para todos os ambientes ou valores diferentes conforme necessário

### Passo 4: Deploy Automático

Após salvar, a Vercel fará o deploy automaticamente. Cada push para a branch principal fará um novo deploy.

## 🔒 Configuração de Segurança

O arquivo `vercel.json` já configura automaticamente:

- ✅ Headers de segurança (CSP, XSS Protection, etc.)
- ✅ Rewrites para SPA (Single Page Application)
- ✅ Configurações de cache

## 📝 Variáveis de Ambiente Necessárias

### Obrigatórias

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase | Supabase Dashboard > Settings > API |

### Opcionais

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Chave da API do Google Maps | Google Cloud Console |
| `VITE_APP_ENV` | Ambiente da aplicação | `production`, `development`, `staging` |
| `VITE_APP_VERSION` | Versão da aplicação | Ex: `1.0.0` |

## 🔧 Troubleshooting

### Build Falha

**Problema**: Build falha com erro de variáveis de ambiente

**Solução**:
1. Verifique se todas as variáveis estão configuradas no Vercel Dashboard
2. Certifique-se de que as variáveis começam com `VITE_`
3. Faça um novo deploy após adicionar variáveis

### Erro 404 em Rotas

**Problema**: Rotas retornam 404 após deploy

**Solução**:
- Verifique se o `vercel.json` tem a configuração de `rewrites` para SPA
- O arquivo já está configurado corretamente

### Erro de CORS

**Problema**: Erro de CORS ao acessar Supabase

**Solução**:
1. Acesse Supabase Dashboard > Settings > API
2. Adicione a URL da Vercel nas **Allowed Origins**
3. Formato: `https://seu-projeto.vercel.app`

### Variáveis não Carregadas

**Problema**: Variáveis de ambiente não estão disponíveis

**Solução**:
1. Verifique se as variáveis começam com `VITE_`
2. Faça um novo deploy após adicionar variáveis
3. Variáveis são injetadas no build, não em runtime

## 📊 Monitoramento

Após o deploy, você pode:

- ✅ Ver logs em tempo real no Vercel Dashboard
- ✅ Monitorar performance e erros
- ✅ Configurar domínio customizado
- ✅ Configurar SSL automático

## 🔄 Deploy Contínuo

Com o método GitHub, cada push para a branch principal:

1. ✅ Dispara um novo build automaticamente
2. ✅ Executa testes (se configurados)
3. ✅ Faz deploy em produção
4. ✅ Envia notificações (se configuradas)

## 📚 Recursos Adicionais

- [Documentação Vercel](https://vercel.com/docs)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)
- [Supabase + Vercel](https://supabase.com/docs/guides/hosting/vercel)
- [Variáveis de Ambiente Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

## ✅ Checklist de Deploy

Antes de considerar o deploy completo:

- [ ] Vercel CLI instalado e autenticado
- [ ] Build local funciona (`npm run build`)
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] CORS configurado no Supabase
- [ ] Domínio configurado (opcional)
- [ ] Testes realizados na URL de produção
- [ ] Logs verificados no Vercel Dashboard

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs no Vercel Dashboard
2. Teste o build localmente: `npm run build && npm run preview`
3. Verifique a documentação do [DEPLOY.md](./DEPLOY.md)
4. Consulte os arquivos de troubleshooting específicos

---

**Última atualização**: $(Get-Date -Format "dd/MM/yyyy")

