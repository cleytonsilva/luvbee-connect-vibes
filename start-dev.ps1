# Script PowerShell para iniciar o servidor de desenvolvimento
# Execute: .\start-dev.ps1 ou powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

Write-Host "🚀 Iniciando servidor de desenvolvimento LuvBee..." -ForegroundColor Cyan

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: package.json não encontrado!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar no diretório luvbee-connect-vibes" -ForegroundColor Yellow
    Write-Host "   Diretório atual: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
        exit 1
    }
}

# Verificar se .env.local existe
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Aviso: .env.local não encontrado!" -ForegroundColor Yellow
    Write-Host "   Certifique-se de configurar as variáveis de ambiente" -ForegroundColor Yellow
}

Write-Host "✅ Iniciando Vite dev server..." -ForegroundColor Green
Write-Host "   Acesse: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""

# Iniciar o servidor
npm run dev

