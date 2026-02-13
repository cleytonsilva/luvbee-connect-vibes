@echo off
echo ========================================
echo   LUVBEE - INICIANDO APP (SIMPLIFICADO)
echo ========================================
echo.

echo Navegando para pasta do projeto...
cd /d "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"

if errorlevel 1 (
    echo ERRO: Nao consegui acessar a pasta!
    echo Verifique se o caminho existe: C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile
    pause
    exit /b 1
)

echo ✅ Pasta encontrada: %cd%
echo.

if not exist "node_modules" (
    echo Instalando dependencias pela primeira vez...
    echo Isso pode levar 2-5 minutos...
    echo.
    npm install
    if errorlevel 1 (
        echo ERRO na instalacao! Tentando metodo alternativo...
        npm install --legacy-peer-deps
    )
)

if exist "node_modules" (
    echo ✅ Dependencias OK
) else (
    echo ❌ ERRO: Dependencias nao instaladas!
    echo Tente executar manualmente:
    echo   cd "C:\Users\LENOVO\Documents\Luvbee-Mobile\mobile"
    echo   npm install
    pause
    exit /b 1
)

echo.
echo ========================================
echo   🚀 INICIANDO EXPO
echo ========================================
echo.
echo 📱 Baixe "Expo Go" no celular e escaneie o QR code
echo.

npx expo start --clear

pause
