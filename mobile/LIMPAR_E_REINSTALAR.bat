@echo off
chcp 65001 >nul
echo 🧹 Limpando e Reinstalando Luvbee Mobile...
echo.

powershell -ExecutionPolicy Bypass -File "LIMPAR_E_REINSTALAR.ps1"

echo.
echo ✅ Processo concluido!
pause
