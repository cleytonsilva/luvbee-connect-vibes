# Documentação da Versão 1.1.0-beta-animations

A versão `v1.1.0-beta-animations` introduz novas animações de cartas usando `react-native-reanimated` e `react-native-gesture-handler`.
Criamos essa branch isolada para poder testar visualmente no celular sem quebrar a versão estável que vai pra produção.

## O Que Foi Modificado:
1. **Stacked Cards (Pilha de Lugares):** Adicionamos a animação de pilha (`StackedCards`), onde o card da frente desliza e os decrescentes vem por trás gradualmente, adaptado para o design Neo-Brutalista (sem blurs excessivos, focado em linhas sólidas e animação elástica).
2. **Tilt Carousel (Cards de Pessoas/Date):** Adicionamos uma lista horizontal responsiva ao scroll (`TiltCarousel`), onde as cartas rotacionam no eixo Z (efeito Tilt) dependendo se estão no meio ou nos cantos da tela.
3. Botões interativos em ambas interfaces que alimentam as funções de *"Like"* e *"Pass"*.

## O Processo de Versionamento do GitHub

O Github gerencia seu código em "Caminhos" chamados Branches (ramos).
- O ramo principal original é o seu "Produção" (master/main).
- O comando executado para isolar isso foi: `git checkout -b v1.1.0-beta-animations`.

### Como Validar e Enviar para Produção
1. Com esse código novo na máquina, você vai abrir o Expo:
   ```bash
   cd mobile
   npm start
   ```
2. Abra o celular e teste as duas telas (Descobrir e Date).
3. Se tudo estiver ok, nós salvamos essas modificações (commitar):
   ```bash
   git add .
   git commit -m "Nova versão 1.1.0 - Animações neo-brutalistas"
   git push origin v1.1.0-beta-animations
   ```
4. Fazer o *Merge* (Misturar com a produção):
   Lá no Github vai aparecer um botão "Compare & pull request". Você clica lá e pede para unir na branch `main`.

Se o teste der errado, a master (onde a antiga lista e swipe viviam normais) continua protegida! Bastando apenas rodar `git checkout main` no terminal.

## Como fazer o Build no Expo pra Celular Físico

Quando você quiser de fato gerar um APK (Android) para mandar pros amigos testarem:
1. Crie o aplicativo na nuvem do Expo:
   ```bash
   cd mobile
   npx eas build --profile preview --platform android
   ```
   *Isso usará a configuração já existente do seu `eas.json` (preview).*
2. Finalizado, ele emite um Link (ou QR Code). Você faz o download do arquivo `.apk`, instala no celular Android, e as novas animações estarão prontas rodando nativas.
