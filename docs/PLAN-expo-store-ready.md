# 🐝 PLAN: Expo Store-Ready Audit — Luvbee Mobile

> **Tipo:** MOBILE (React Native / Expo SDK 54)
> **Agent:** `mobile-developer`
> **Data:** 2026-02-10 (Atualizado com feedback do usuário)

---

## Overview

Correção da infraestrutura EAS e preparação para publicação nas lojas. O usuário já forneceu o ícone (`public/abaicon.png`) mas enfrenta erro de UUID no EAS. Contas de desenvolvedor e privacy policy estão pendentes.

## Success Criteria

- [ ] `eas build` inicia sem erro `Invalid UUID`
- [ ] Ícone e Splash Screen gerados corretamente a partir de `public/abaicon.png`
- [ ] `eas.json` configurado corretamente
- [ ] App inicia sem problemas visuais (splash screen)
- [ ] Privacy Policy básica criada e linkada no app

---

## Task Breakdown

### Fase 1: Correção Imediata EAS (P0 — Bloqueante)

#### T1.1: Limpar Configuração EAS Quebrada
- **Agent:** mobile-developer
- **INPUT:** `app.json` com `projectId` inválido
- **OUTPUT:** `app.json` limpo
- **VERIFY:** `eas project:info` não retorna erro de UUID

#### T1.2: Re-vincular Projeto EAS
- **Agent:** mobile-developer (usuário executa `eas init` se necessário)
- **INPUT:** `eas init`
- **OUTPUT:** Novo `projectId` válido no `app.json`
- **VERIFY:** `eas project:info` retorna dados corretos

#### T1.3: Criar `eas.json` Corrigido
- **Agent:** mobile-developer
- **INPUT:** Sem arquivo
- **OUTPUT:** `eas.json` com profiles dev/preview/prod
- **VERIFY:** `eas build --profile development --platform android --local` inicia

---

### Fase 2: Assets e Branding (P1 — Alta)

#### T2.1: Gerar Ícones e Splash
- **Agent:** mobile-developer
- **INPUT:** `public/abaicon.png`
- **OUTPUT:** `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`
- **VERIFY:** Arquivos existem e estão referenciados no `app.json`

#### T2.2: Configurar Splash Screen
- **Agent:** mobile-developer
- **INPUT:** `_layout.tsx` sem config de splash
- **OUTPUT:** `expo-splash-screen` configurado para ocultar após carregamento
- **VERIFY:** App inicia suavemente

---

### Fase 3: Permissões e Compliance (P1 — Alta)

#### T3.1: Criar Privacy Policy
- **Agent:** mobile-developer
- **INPUT:** N/A
- **OUTPUT:** `PRIVACY.md` na raiz com texto padrão
- **VERIFY:** Arquivo existe

#### T3.2: Ajustar Permissões Android
- **Agent:** mobile-developer
- **INPUT:** Permissões excessivas no `app.json`
- **OUTPUT:** Apenas permissões essenciais (INTERNET, ACCESS_COARSE_LOCATION, etc.)
- **VERIFY:** Build Android sem warnings críticos

---

### Fase 4: Robustez e Finalização (P2 — Média)

#### T4.1: Error Boundary
- **Agent:** mobile-developer
- **INPUT:** Sem proteção global
- **OUTPUT:** `ErrorBoundary.tsx`
- **VERIFY:** App recupera de erro forçado

#### T4.2: Verificação Final
- **Agent:** mobile-developer
- **INPUT:** App configurado
- **OUTPUT:** Checklist de publicação preenchido
- **VERIFY:** Todos os itens OK

---

## Phase X: Verification

1. **EAS Config**: `eas project:info` OK
2. **Build**: `eas build --local` passa
3. **Assets**: Ícone e Splash visíveis e corretos
4. **Compliance**: Privacy Policy disponível (em arquivo)
