# Como Iniciar o Servidor de Desenvolvimento

## Método 1: Usando o Script PowerShell (Recomendado)

1. Abra o PowerShell no diretório do projeto:
   ```powershell
   cd C:\Users\LENOVO\Documents\Luvbee2\luvbee-connect-vibes
   ```

2. Execute o script:
   ```powershell
   .\start-dev.ps1
   ```

   Ou se houver problemas de política de execução:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
   ```

## Método 2: Comando Direto

1. Navegue para o diretório do projeto:
   ```powershell
   cd C:\Users\LENOVO\Documents\Luvbee2\luvbee-connect-vibes
   ```

2. Execute o comando:
   ```powershell
   npm run dev
   ```

## Método 3: Se já estiver no diretório correto

Se você já estiver dentro de `luvbee-connect-vibes`, simplesmente execute:
```powershell
npm run dev
```

## Verificar se está no diretório correto

Execute este comando para verificar:
```powershell
Get-Location
```

Você deve ver algo como:
```
C:\Users\LENOVO\Documents\Luvbee2\luvbee-connect-vibes
```

## Solução de Problemas

### Erro: "package.json não encontrado"
- Certifique-se de estar no diretório `luvbee-connect-vibes`
- Use `cd luvbee-connect-vibes` para navegar

### Erro: "npm não é reconhecido"
- Instale o Node.js: https://nodejs.org/
- Reinicie o terminal após instalar

### Porta 8080 já está em uso
- Pare outros processos Node.js
- Ou altere a porta no arquivo `vite.config.ts`

### Muitos processos Node rodando
Execute para ver todos os processos:
```powershell
Get-Process -Name node | Format-Table Id, ProcessName, StartTime
```

Para parar todos os processos Node (cuidado!):
```powershell
Stop-Process -Name node -Force
```

## Acesso à Aplicação

Após iniciar o servidor, acesse:
- **URL**: http://localhost:8080
- **Home**: http://localhost:8080/
- **Login**: http://localhost:8080/auth
- **Onboarding**: http://localhost:8080/onboarding

