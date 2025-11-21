## Objetivo

* Organizar o projeto para produção na Vercel e atualizar `.vercelignore` para excluir arquivos não essenciais (config local, testes, docs internas, scripts, IDE e caches).

## Auditoria do projeto (estado atual)

* Estrutura principal de aplicação em `src/` e `public/`; configs essenciais em `index.html`, `package.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json`, `vercel.json`.

* Já existe `.vercelignore` com exclusões parciais (docs, scripts, testes, IDE, temporários). Faltam entradas como `.env`, `__tests__/`, `node_modules/`, caches adicionais e pastas internas de ferramentas.

## Itens essenciais (manter no deploy)

* `src/**`, `public/**`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json`, `vercel.json`, `components.json`.

## Itens a excluir no deploy

* Config local: `.env`, `.env.local`, `.env.*.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`.

* Testes: `__tests__/`, `src/**/__tests__/`, `test/`, `*.test.*`, `*.spec.*`, `coverage/`, `.nyc_output/`, `vitest.config.ts`.

* Documentação interna: `docs/`, `specs/`, `.trae/`, `.cursor/`, `.specify/`, `spec-kit-temp/`, `.github/`, `README-internal.md`, `.project-info.md`, (opcional) `*.md` exceto `README.md`.

* Scripts e ferramentas locais: `scripts/`, `*.ps1`, `start-dev.ps1`.

* IDE: `.vscode/`, `.idea/`.

* Temporários e cache: `tmp/`, `temp/`, `*.tmp`, `*.temp`, `*.log`, `.cache/`, `.parcel-cache/`, `Thumbs.db`, `.DS_Store`, `.eslintcache`, `*.tsbuildinfo`.

* Dependências locais: `node_modules/`.

* Locks alternativos: `bun.lockb`, `yarn.lock`, `pnpm-lock.yaml`.

* Assets grandes não usados: `public/videos/`, `public/videos2/`, `*.mp4`, `*.webm`.

* Supabase (não necessário no bundle da Vercel): `supabase/**`, mantendo apenas o que for referenciado pelo app (atual code usa `src/integrations/**`).

## Atualização proposta de `.vercelignore`

* Substituir o conteúdo por:

```
# Configuração local
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local

# Testes
__tests__/
src/**/__tests__/
test/
*.test.*
*.spec.*
coverage/
.nyc_output/
vitest.config.ts

# Documentação interna
docs/
specs/
.trae/
.cursor/
.specify/
spec-kit-temp/
.github/
README-internal.md
.project-info.md
*.md
!README.md

# Scripts e ferramentas locais
scripts/
*.ps1
start-dev.ps1

# IDE
.vscode/
.idea/

# Temporários e cache
.tmp/
.temp/
tmp/
temp/
*.tmp
*.temp
*.log
.cache/
.parcel-cache/
Thumbs.db
.DS_Store
.eslintcache
*.tsbuildinfo

# Dependências e locks alternativos
node_modules/
bun.lockb
yarn.lock
pnpm-lock.yaml

# Assets grandes não usados
public/videos/
public/videos2/
*.mp4
*.webm

# Supabase (não necessário no deploy Vercel)
supabase/**
```

## Organização complementar

* Mover arquivos de teste avulsos do root (`test-discovery-integration.js`, `test-fetch-places.js`, `test-email-validation.html`) para `src/test/` ou `__tests__/` (padronizar nomenclatura `*.test.*`).

* Manter somente configs de build necessárias na raiz; arquivos de auditoria e relatórios permanecem fora do deploy via `.vercelignore`.

## Validação pós-aplicação

* Rodar um build de preview na Vercel e verificar que apenas arquivos essenciais são enviados.

* Checar logs de build e garantir que `tailwind`, `postcss`, `vite` e `tsconfig` são reconhecidos.

* Confirmar que variáveis sensíveis não estão no artefato (RLS e segurança preservadas).

Se aprovar, aplico a atualização em `.vercelignore`, faço a reorganização dos arquivos de teste e confirmo o comportamento com um build de preview.
