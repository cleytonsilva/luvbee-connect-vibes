# Luvbee Mobile - Dating App

Aplicativo de relacionamentos com diferencial de conexão através de lugares.

## 🚀 Como Executar

### 1. Instalar dependências
```bash
cd "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
npm install
```

### 2. Iniciar o app
```bash
npx expo start
```

### 3. Testar
- **Celular:** Escaneie o QR code com Expo Go
- **Emulador:** Pressione "a" (Android) ou "i" (iOS)
- **Web:** Pressione "w"

## 📱 Funcionalidades

### ✅ Implementadas
- [x] Autenticação (login/cadastro)
- [x] Sistema de swipe (like/pass/super like)
- [x] Perfil do usuário
- [x] Design neobrutalista
- [x] Navegação por tabs
- [x] Integração Supabase

### 🚧 Em desenvolvimento
- [ ] Chat em tempo real
- [ ] Moderação de fotos (AI)
- [ ] Verificação de identidade
- [ ] Sistema de lugares completo

## 🎨 Design System

### Cores Neobrutalistas
- **Amarelo:** #FFE600
- **Rosa:** #FF6B9D
- **Azul:** #00D9FF
- **Verde:** #00FF94
- **Preto:** #000000

### Características
- Bordas grossas (3-4px)
- Sombras硬 (sem blur)
- Tipografia bold
- Animações spring

## 🏗️ Estrutura

```
mobile/
├── app/                    # Telas (Expo Router)
│   ├── (auth)/            # Autenticação
│   └── (tabs)/            # Tabs principais
├── src/
│   ├── components/        # Componentes
│   ├── stores/           # Zustand stores
│   ├── services/         # Supabase
│   ├── types/            # TypeScript
│   └── constants/        # Tema
└── assets/               # Imagens/ícones
```

## 🚀 Publicação

### Android (Play Store)
```bash
eas build --platform android
```

### iOS (App Store)
```bash
eas build --platform ios
```

## 🔧 Configuração

Editar `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=sua-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave
```

## 📄 Licença

Privado - Luvbee Dating App
