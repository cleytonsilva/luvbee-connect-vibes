# 🎨 Design System - LuvBee Core Platform

## 🎨 Cores Principais

### Cores de Marca (Neo-Brutalista)

| Cor | Hex | HSL | Uso |
|-----|-----|-----|-----|
| **Primary (Magenta)** | `#ff00ff` | `300 100% 50%` | Cor principal da marca |
| **Accent (Amarelo)** | `#FFFF00` | `60 100% 50%` | Cor de destaque/accent |
| **Background** | `#f8f5f8` | `320 20% 97%` | Cor de fundo |
| **Foreground** | `#000000` | `0 0% 0%` | Cor de texto principal |
| **Border** | `#000000` | `0 0% 0%` | Cor de bordas |

### Paleta Completa

#### Cores Principais
- **Primary**: `#ff00ff` (Magenta) - `hsl(300, 100%, 50%)`
- **Primary Foreground**: `#ffffff` (Branco) - `hsl(0, 0%, 100%)`

#### Cores Secundárias
- **Secondary**: `hsl(280, 60%, 60%)` - Roxo suave
- **Secondary Foreground**: `#000000` (Preto)

#### Cores de Acento
- **Accent**: `hsl(330, 100%, 60%)` - Rosa elétrico
- **Accent Foreground**: `#ffffff` (Branco)

#### Cores Neutras
- **Muted**: `hsl(320, 15%, 92%)` - Bege claro
- **Muted Foreground**: `hsl(0, 0%, 40%)` - Cinza médio
- **Border**: `hsl(0, 0%, 85%)` - Cinza claro
- **Input**: `hsl(0, 0%, 90%)` - Cinza muito claro

#### Cores de Estado
- **Destructive**: `hsl(0, 84%, 60%)` - Vermelho para erros
- **Success**: `hsl(140, 70%, 50%)` - Verde para sucesso

### Modo Escuro (Dark Mode)

| Variável | Valor HSL | Descrição |
|----------|-----------|-----------|
| `--background` | `320 40% 5%` | Fundo escuro (`#1a101a`) |
| `--foreground` | `0 0% 100%` | Texto branco |
| `--card` | `320 35% 10%` | Cards escuros |
| `--primary` | `300 100% 50%` | Magenta (mantém) |
| `--accent` | `330 100% 60%` | Rosa elétrico (mantém) |

## 🔤 Fontes

### Família de Fontes Principal

**Space Grotesk** - Fonte Sans-Serif
- **Pesos disponíveis**: 300, 400, 500, 600, 700
- **Uso**: Texto geral, títulos, interface
- **Importação**: Google Fonts
- **Fallback**: `ui-sans-serif`, `system-ui`

### Família de Fontes Monoespaçada

**Space Mono** - Fonte Mono
- **Pesos disponíveis**: 400, 700
- **Uso**: Código, elementos técnicos
- **Importação**: Google Fonts
- **Fallback**: `ui-monospace`, `monospace`

### Configuração CSS

```css
/* Importação das fontes */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

/* Aplicação no body */
body {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Títulos */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
}

/* Código */
code, pre {
  font-family: 'Space Mono', monospace;
}
```

## 🎯 Estilo Visual (Neo-Brutalista)

### Características

- **Sombras Hard**: `4px 4px 0px 0px #000` (sombra dura preta)
- **Bordas Grossas**: Bordas de 2px (`border-2`)
- **Cores Vibrantes**: Magenta e Amarelo como cores principais
- **Contraste Alto**: Preto e branco para legibilidade
- **Tipografia Bold**: Pesos 600-700 para títulos

### Classes Tailwind Customizadas

```css
.shadow-hard {
  box-shadow: 4px 4px 0px 0px #000;
}
```

## 📋 Uso no Código

### Cores via Tailwind

```tsx
// Primary (Magenta)
<div className="bg-primary text-primary-foreground">...</div>

// Accent (Amarelo - via yellow-400/500)
<div className="bg-yellow-500 text-white">...</div>

// Background
<div className="bg-background">...</div>

// Texto
<p className="text-foreground">...</p>
```

### Fontes via Tailwind

```tsx
// Fonte Sans (Space Grotesk)
<div className="font-sans">...</div>

// Fonte Mono (Space Mono)
<code className="font-mono">...</code>
```

### Constantes TypeScript

```typescript
// src/lib/constants.ts
export const COLORS = {
  primary: '#ff00ff', // Magenta
  accent: '#FFFF00', // Yellow
  background: '#f8f5f8',
  foreground: '#000000',
  border: '#000000',
} as const

export const FONTS = {
  sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
  mono: ['Space Mono', 'ui-monospace', 'monospace'],
} as const
```

## 🎨 Paleta de Cores Visual

```
┌─────────────────────────────────────────┐
│  PRIMARY (Magenta)                      │
│  #ff00ff                                │
│  ████████████████████████████████████  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ACCENT (Amarelo)                       │
│  #FFFF00                                │
│  ████████████████████████████████████  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  BACKGROUND                             │
│  #f8f5f8                                │
│  ████████████████████████████████████  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FOREGROUND (Texto)                     │
│  #000000                                │
│  ████████████████████████████████████  │
└─────────────────────────────────────────┘
```

## 📝 Referências

- **Especificação**: `specs/001-luvbee-core-platform/spec.md` - FR-019
- **Configuração CSS**: `src/index.css`
- **Configuração Tailwind**: `tailwind.config.ts`
- **Constantes**: `src/lib/constants.ts`

## ✅ Checklist de Aplicação

- ✅ Cores primárias definidas (Magenta #ff00ff e Amarelo #FFFF00)
- ✅ Fontes Space Grotesk e Space Mono configuradas
- ✅ Sombras hard implementadas
- ✅ Bordas grossas aplicadas
- ✅ Design neo-brutalista aplicado

