@echo off
chcp 65001 >nul
echo ========================================
echo   LUVBEE - INICIANDO APP
echo ========================================
echo.

cd /d "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"

echo 📂 Pasta: %cd%
echo.

if not exist "node_modules" (
    echo ⚠️  Instalando dependências...
    call npm install
    if errorlevel 1 (
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
)

echo 🚀 Iniciando Expo...
echo.
echo 📱 Para testar:
echo    1. Baixe "Expo Go" no celular
echo    2. Escaneie o QR code
echo.
echo 💻 Comandos: a=Android, w=Web, r=Reload
echo.
echo ========================================
echo.

npx expo start --clear

pause
