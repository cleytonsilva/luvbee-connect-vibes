# 🔧 Solução de Problemas - Luvbee Mobile

## Problema: INICIAR.bat não funciona

### Solução 1: Executar manualmente no PowerShell

1. **Abra o PowerShell** como Administrador
2. **Execute:**
```powershell
cd "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
npm install
npx expo start
```

---

### Solução 2: Usar CMD (Prompt de Comando)

1. **Abra o CMD**
2. **Execute:**
```cmd
cd /d C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile
npm install
npx expo start --clear
```

---

### Solução 3: Verificar se pasta existe

Execute no PowerShell:
```powershell
Test-Path "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
```

Se retornar `False`, a pasta não existe. Recrie o projeto.

---

### Solução 4: Problema de permissões

1. Clique direito no arquivo `.bat`
2. Selecione "Executar como administrador"

---

### Solução 5: Erro "npx não reconhecido"

Instale o Node.js:
https://nodejs.org (baixe a versão LTS)

---

## Erros Comuns

### ❌ "Cannot find module"
```bash
npm install --legacy-peer-deps
```

### ❌ "Metro bundler cache"
```bash
npx expo start --clear
```

### ❌ "Port 8081 already in use"
```bash
npx expo start --port 8082
```

### ❌ "JavaScript heap out of memory"
```bash
set NODE_OPTIONS=--max-old-space-size=4096
npx expo start
```

---

## Testar no Navegador (Mais fácil)

Se o celular não funcionar, teste no PC:

```bash
cd "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
npx expo start --web
```

Acesse: http://localhost:8081

---

## Precisa de ajuda?

1. Verifique se o Node.js está instalado:
   ```bash
   node --version
   npm --version
   ```

2. Verifique a instalação do Expo:
   ```bash
   npx expo --version
   ```

3. Veja os logs de erro:
   ```bash
   cd "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
   npx expo start --clear 2>&1 | tee log.txt
   ```

---

## 🆘 Último recurso

Se nada funcionar, execute diretamente pelo explorador:

1. Abra a pasta: `C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile`
2. Clique na barra de endereço
3. Digite: `cmd` e pressione Enter
4. Execute: `npx expo start`
