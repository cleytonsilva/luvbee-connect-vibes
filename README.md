# 🐝 LUVBEE - Dating App

Aplicativo de relacionamentos com diferencial de conexão através de lugares.

## 🎯 Diferencial

Conecte-se com pessoas que frequentam os mesmos lugares que você!

---

## ✨ Funcionalidades

### Core
- ✅ Sistema de Swipe (Like/Pass/Super Like)
- ✅ Match por afinidade de lugares
- ✅ Chat em tempo real
- ✅ Perfil completo com fotos
- ✅ Descoberta de lugares

### Segurança
- ✅ Verificação de idade (18+)
- ✅ Verificação de identidade
- ✅ Moderação de fotos (anti-nudes)
- ✅ Sistema de reporte
- ✅ Bloqueio de usuários

### Design
- 🎨 Neobrutalista vibrante
- 🎨 Cores: amarelo, rosa, azul, verde
- 🎨 Animações fluidas
- 🎨 Interface intuitiva

---

## 📱 Telas

1. **Welcome** - Tela inicial
2. **Login/Cadastro** - Autenticação
3. **Verificação** - Idade e identidade
4. **Discover** - Swipe de perfis
5. **Lugares** - Descoberta de locais
6. **Curtidas** - Quem curtiu você
7. **Matches** - Conversas
8. **Perfil** - Configurações

---

## 🛠️ Tecnologias

- **React Native** + **Expo**
- **TypeScript**
- **Supabase** (Auth + Database + Realtime)
- **Zustand** (State Management)
- **Reanimated** (Animações)

---

## 📂 Estrutura

```
mobile/
├── app/                    # Telas (Expo Router)
│   ├── (auth)/            # Autenticação
│   └── (tabs)/            # Tabs principais
├── src/
│   ├── components/        # UI Components
│   ├── stores/           # Zustand stores
│   ├── services/         # API/Supabase
│   ├── types/            # TypeScript
│   └── constants/        # Tema
└── assets/               # Imagens
```

---

## 🚀 Iniciar

```bash
# Executar
C:\Users\LENOVO\Documents\Luvbee-Mobile\INICIAR.bat

# Ou manualmente
cd mobile
npx expo start
```

---

## 📦 Build

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

---

## 📄 Documentação

- `README.md` - Este arquivo
- `INSTALL.md` - Guia de instalação
- `supabase/migrations/` - Schema do banco

---

## 🔐 Segurança

- RLS (Row Level Security) ativo
- Moderação de conteúdo
- Verificação de identidade
- Dados criptografados

---

## 🎨 Design System

### Cores
- Primary: #FFE600 (Yellow)
- Secondary: #FF6B9D (Pink)
- Accent: #00D9FF (Blue)
- Success: #00FF94 (Green)

### Estilo
- Bordas: 3-4px sólidas
- Sombras: Hard (sem blur)
- Fonte: Bold/Semibold
- Radius: 8-16px

---

**Pronto para conquistar o mundo! 🌍💕**

Desenvolvido com ❤️ para conectar pessoas
