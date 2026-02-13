# 🚀 Guia de Instalação e Configuração - Luvbee Mobile

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI
- Conta no Supabase
- Conta no Expo (EAS)

---

## 🛠️ Passo a Passo

### 1. Clone/Preparação

O projeto está em:
```
C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile
```

### 2. Instalar Dependências

```bash
cd "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie/editar o arquivo `.env.local`:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon

# Google Maps (opcional, para mapas)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-google-maps
```

### 4. Configurar Supabase

1. Acesse https://supabase.com
2. Crie um novo projeto
3. Vá em SQL Editor
4. Cole o conteúdo do arquivo:
   ```
   C:\Users\LENOVO\Documents\Luvbee-Mobile\supabase\migrations\001_initial_schema.sql
   ```
5. Execute o script

### 5. Configurar Storage (Bucket)

No Supabase Dashboard:
1. Vá em Storage
2. Crie buckets:
   - `profile-photos` (público)
   - `verification-documents` (privado)
3. Configure políticas de acesso

### 6. Testar Localmente

```bash
npx expo start
```

Escaneie o QR code com o Expo Go no celular.

---

## 📱 Build para Produção

### Android (APK/AAB)

```bash
eas build --platform android
```

### iOS (IPA)

```bash
eas build --platform ios
```

---

## 🚀 Publicação nas Lojas

### Google Play Store

1. Acesse https://play.google.com/console
2. Crie nova app
3. Configure:
   - Nome: Luvbee
   - Bundle ID: com.luvbee.dating
   - Ícone e screenshots
4. Faça upload do AAB gerado pelo EAS
5. Preencha questionário de segurança
6. Aguarde revisão

### Apple App Store

1. Acesse https://appstoreconnect.apple.com
2. Crie novo app
3. Configure:
   - Nome: Luvbee
   - Bundle ID: com.luvbee.dating
   - Screenshots e metadados
4. Faça upload do IPA via Transporter
5. Preencha informações de privacidade
6. Aguarde revisão

---

## 🔐 Configurações de Segurança

### Supabase - Políticas RLS

As tabelas já têm RLS configurado. Verifique no dashboard:
1. Vá em Authentication → Policies
2. Confirme que todas as tabelas têm políticas ativas

### Moderação de Conteúdo

Para ativar moderação de fotos com IA:

1. Opção 1: Google Vision AI
   - Ative API no Google Cloud
   - Adicione a chave ao .env

2. Opção 2: AWS Rekognition
   - Configure credenciais AWS
   - Integre no serviço de moderação

3. Opção 3: Moderadores humanos
   - Configure fila de revisão no Supabase
   - Contrate moderadores

---

## 📊 Monitoramento

### Analytics

Instale e configure:
```bash
npx expo install expo-analytics-amplitude
```

### Crash Reporting

```bash
npx expo install sentry-expo
```

---

## 🆘 Suporte

### Problemas comuns:

**Erro: "Cannot find module"**
```bash
rm -rf node_modules
npm install
```

**Erro: "Metro bundler cache"**
```bash
npx expo start --clear
```

**Erro: "Supabase connection"**
- Verifique as variáveis de ambiente
- Confirme se o projeto Supabase está ativo

---

## 📄 Documentação Adicional

- [Expo Docs](https://docs.expo.dev)
- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev)

---

**Pronto para publicar! 🎉**
