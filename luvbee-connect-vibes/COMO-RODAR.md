# 🚀 Como Iniciar o Servidor - GUIA RÁPIDO

## ✅ Você já está no diretório correto!

Se você está vendo este arquivo, significa que já está dentro de `luvbee-connect-vibes`.

## 📝 Passos para iniciar:

### 1. Abra o PowerShell neste diretório
   - Navegue até: `C:\Users\LENOVO\Documents\Luvbee2\luvbee-connect-vibes`
   - Ou clique com botão direito na pasta e escolha "Abrir no Terminal"

### 2. Execute APENAS este comando:
```powershell
npm run dev
```

**NÃO execute `cd luvbee-connect-vibes` novamente!** Você já está lá!

### 3. Aguarde a mensagem:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

### 4. Acesse no navegador:
- **URL**: http://localhost:8080

## ⚠️ Problemas Comuns:

### Erro: "package.json não encontrado"
- Você está no diretório errado
- Execute: `Get-Location` para ver onde está
- Navegue até: `cd C:\Users\LENOVO\Documents\Luvbee2\luvbee-connect-vibes`

### Erro: "npm não é reconhecido"
- Instale Node.js: https://nodejs.org/
- Reinicie o terminal após instalar

### Porta 8080 já está em uso
- Pare outros processos Node.js:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Muitos processos Node rodando
Para ver todos:
```powershell
Get-Process -Name node | Format-Table Id, ProcessName, StartTime
```

Para parar todos (cuidado!):
```powershell
Stop-Process -Name node -Force
```

## 📂 Estrutura de Diretórios:

```
Luvbee2/
└── luvbee-connect-vibes/  ← VOCÊ DEVE ESTAR AQUI
    ├── package.json        ← Este arquivo deve existir
    ├── vite.config.ts
    ├── src/
    └── ...
```

## 🎯 Comando Completo (se necessário):

Se você estiver em `C:\Users\LENOVO\Documents\Luvbee2`:

```powershell
cd luvbee-connect-vibes
npm run dev
```

Mas se já estiver em `C:\Users\LENOVO\Documents\Luvbee2\luvbee-connect-vibes`:

```powershell
npm run dev
```

## ✅ Verificar se está no lugar certo:

Execute:
```powershell
Test-Path package.json
```

Se retornar `True`, você está no lugar certo! ✅

