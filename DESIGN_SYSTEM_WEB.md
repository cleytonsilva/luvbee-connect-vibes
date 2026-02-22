# 🎨 Luvbee Web - Design System e Documentação de Arquitetura

Este documento define as diretrizes visuais e as arquiteturas de dados compartilhadas entre o App Mobile (React Native/Expo) e a futura versão Web (React/Next.js). Ambas as aplicações devem se comportar como clientes da mesma stack backend, garantindo consistência visual e funcional.

---

## 🏗 Stack Compartilhada (Backend e Integrações)

A versão web utilizará as mesmas chaves e serviços configurados para o app mobile:

1. **Banco de Dados & Autenticação:** Supabase (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
2. **APIs Externas:** 
   - Google Maps Places API 
   - Geocoding API (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`)
3. **Edge Functions (Supabase):**
   - `search-nearby` (Busca de lugares, categorias e filtros de vibe)
   - `get-place-photo` / `cache-place-photo` (Serviço intermediário de proxy de imagens do Google)
   - `spider-events` / `cache-events` (Scrapers e manipuladores)

> **Importante para a Web:** Variáveis iniciadas com `EXPO_PUBLIC_` podem precisar ser convertidas para o framework escolhido (ex: `NEXT_PUBLIC_` para Next.js ou `VITE_` para Vite.js).

---

## 💅 Diretrizes Visuais (Estilo Neobrutalista)

A identidade visual do Luvbee baseia-se no design **Neobrutalista**: focado em alto contraste, bordas grossas (hard borders), cores vibrantes chapadas e ausência de gradientes suaves.

### 1. Paleta de Cores
A versão web deve declarar essas cores como variáveis CSS (ex: `:root { --color-yellow: #FFE600; }`) ou adicioná-las no `tailwind.config.js`.

| Nome da Cor | Hexadecimal | Uso Principal |
| :--- | :--- | :--- |
| **Black** | `#000000` | Textos principais, background de botões primários, bordas sólidas pesadas |
| **White** | `#FFFFFF` | Backgrounds principais da página e texto invertido |
| **Yellow** | `#FFE600` | Marca registrada (Cor base do app e Splash Screen), botões primários invertidos |
| **Pink** | `#FF6B9D` | Ícones de amor, botão de "Like", chamadas para ação emocionais |
| **Blue** | `#00D9FF` | Tags neutras, botões secundarios |
| **Green / Success** | `#00FF94` | Estados de sucesso e aceitação |
| **Purple** | `#B829DD` | Ícones e tags de baladas (ex: nightlife) |
| **Orange** | `#FF6B35` | Ícones de alertas/notificações amigáveis |
| **Red / Error** | `#FF4444` | Botão de "Pass", rejeições, deletar contas e erros |

**Tons de Cinza (Gray Scale):**
A Web utilizará uma escala de cinzas bem definida para placeholders e textos secundários, evite tons transparentes (use opacidade "dura"):
- Escuros (Textos Secundários): `gray900` (#171717), `gray800` (#262626), `gray700` (#404040)
- Neutros (Bordas leves, Separadores): `gray400` (#A3A3A3), `gray300` (#D4D4D4)
- Claros (Fundos secudários, Inputs): `gray200` (#E5E5E5), `gray100` (#F5F5F5)

### 2. Tipografia

A tipografia da Web será mantida exatamente a mesma que inspirou o Web/Mobile original.
Sendo configuradas preferencialmente via Google Fonts.

* **Fonte Principal (Títulos, Textos e UI Geral):** `Space Grotesk`
* **Fonte Secundária (Números, Monospace, Tags Técnicas):** `Space Mono`

*(Pesos sugeridos: 400 Normal, 500 Medium, 600 Semibold, 700 Bold, 800 Extrabold)*

### 3. Componentes e Formas Geométricas (Borders & Shadows)

O estilo Neobrutalista requer **Bordas Duras e Grossas**, além de **Sombras Secas** (Sem blur radius).

#### Configuração das Sombras (CSS Equivalente)
Na web, traduza o `shadowRadius: 0` do Mobile para o box-shadow tradicional:
- **Shadow SM:** `box-shadow: 2px 2px 0px 0px #000000;`
- **Shadow MD:** `box-shadow: 3px 3px 0px 0px #000000;` 
- **Shadow LG:** `box-shadow: 4px 4px 0px 0px #000000;` 
- **Shadow XL:** `box-shadow: 6px 6px 0px 0px #000000;`

> **Nota:** Nas interações da Web (como `a:hover` ou `button:hover`), a sombra deve sofrer uma transição, geralmente se "achatando" (diminuindo de `4px` para `0px` se pressionado (`:active`), e traduzindo a posição do botao com `transform: translate(4px, 4px)`) simulando um botão físico.

#### Bordas (Borders)
Todos os cartões interativos (ex: *PlaceListCard*, *VibeCard*) levam uma borda sólida:
- **Padrão Neobrutalista:** `border: 2px solid #000000;`
- **Torno das Imagens:** Imagens não precisam sempre ter borderRadius agressivo, mas quando têm, usa-se o equivalente a `12px` (`md`), ou `16px` (`xl`).

---

## 🚀 Reprodutibilidade e Integrações Claves

### 1. Sistema Geomático e Endereços (Geolocalização)
A Web pedirá ao navegador o uso da [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) padrão do browser em vez do pacote `expo-location`. 
- Tenha sempre as **mesmas etapas de Fallback**: Se GPS falhar ou usuário negar, recorra para Cidade do Perfil -> Geocoding -> "São Paulo" default fallback; semelhante ao Mobile (*geolocationService.ts*).

### 2. Autenticação (Supabase)
O tratamento de cookies/sessões na versão web baseada em React/Next se dará pelo `supabase-auth-helpers-nextjs` ou `@supabase/ssr`. Garanta as lógicas idênticas do mobile de rotas protegidas (só acessa conteúdo restrito após cadastro preenchido).

### 3. Interface Discovery (Card Swipe vs. Listagem)
- No Mobile, temos uma pilha de cartas (Swipe), já para um formato Web Desktop/Responsivo pode-se priorizar uma grid expansiva (galeria), enquanto para telas restritas móveis simulando PWAs, a ideia do Card Swipe poderá ser importada via bibliotecas como `react-tinder-card` ou framer-motion.

### 4. Gestão do Mapa de Imagens do Google
A obtenção e exibição das fotos no Mobile ocorre por um middleware (`get-place-photo`). Na Web isso torna-se **essencial** para evitar problemas graves de `CORS` com a API Direta de lugares (Google Places). 
Portanto: Nunca chame uma URL `maps.googleapis.com` numa tag `<img>` no client side (A menos que já tratada). Use exatamente o nosso utilitário adaptado que envelopa o path com a Edge Function:
```javascript
// Exemplo arquitetural do Edge Function para a imagem HTML5:
<img src="https://[PROJECT-REF].supabase.co/functions/v1/get-place-photo?photoreference=XXX&maxwidth=400" />
```

---

## 🛠️ Exemplo de TailwindCSS Settings (Sugestão para a Web)

Se optar pelo TailwindCSS na Web, esse snippet garantirá os tokens exatos deste sistema:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        luvbee: {
          yellow: '#FFE600',
          pink: '#FF6B9D',
          blue: '#00D9FF',
          green: '#00FF94',
          purple: '#B829DD',
          orange: '#FF6B35',
          red: '#FF4444',
          black: '#000000',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px 0px #000000',
        'brutal-md': '3px 3px 0px 0px #000000',
        'brutal-lg': '4px 4px 0px 0px #000000',
      },
      borderWidth: {
        'brutal': '2px', // Borda global solid grossa
      }
    }
  }
}
```

Este documento pode servir como fundação guia para o início do front-end Web. Todo o back-end (Supabase) já se comunica de forma centralizada!
