@echo off
REM Script para iniciar o servidor e abrir todos os frontends
REM Mock API Server - Start All (Windows)

echo.
echo ================================
echo Mock API Server - Iniciando...
echo ================================
echo.

REM Verificar se .env existe
if not exist .env (
    echo [!] Arquivo .env nao encontrado!
    echo Copiando .env.local para .env...
    copy .env.local .env
    echo [OK] Arquivo .env criado
    echo.
)

REM Verificar se node_modules existe
if not exist node_modules (
    echo [!] Dependencias nao instaladas!
    echo Instalando dependencias...
    call npm install
    echo [OK] Dependencias instaladas
    echo.
)

REM Iniciar o servidor
echo [*] Iniciando servidor...
start /B npm run dev

REM Aguardar o servidor iniciar
echo Aguardando servidor iniciar...
timeout /t 10 /nobreak >nul

REM Abrir frontends
echo.
echo [*] Abrindo interfaces web...
echo.

echo [*] Dashboard: http://localhost:3000/dashboard
timeout /t 2 /nobreak >nul
start http://localhost:3000/dashboard

echo [*] GraphQL Playground: http://localhost:3000/graphql
timeout /t 2 /nobreak >nul
start http://localhost:3000/graphql

echo [*] WebSocket Test Client: docs/websocket-test-client.html
timeout /t 2 /nobreak >nul
start docs\websocket-test-client.html

echo.
echo ================================
echo [OK] Tudo pronto!
echo ================================
echo.
echo URLs Disponiveis:
echo   Servidor:          http://localhost:3000
echo   Dashboard:         http://localhost:3000/dashboard
echo   GraphQL:           http://localhost:3000/graphql
echo   WebSocket Client:  docs/websocket-test-client.html
echo   Health Check:      http://localhost:3000/admin/health
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

pause
