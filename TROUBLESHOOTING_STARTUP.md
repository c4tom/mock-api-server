# Troubleshooting - Problemas de Inicialização

Guia para resolver problemas comuns ao iniciar o servidor.

## ❌ Erro: "Cannot read properties of undefined"

### Sintoma
```
{"error":{"code":"INTERNAL_SERVER_ERROR","message":"Cannot read properties of undefined (reading 'corsMiddleware')"}}
```

### Causa
Configuração incompleta ou variáveis de ambiente faltando.

### Solução

#### 1. Verifique o arquivo .env

Certifique-se que todas as variáveis necessárias estão definidas:

```bash
# Verifique se .env existe
ls -la .env

# Se não existir, copie o template
cp .env.local .env
```

#### 2. Variáveis obrigatórias

O `.env` DEVE ter estas variáveis:

```env
# Server
PORT=3000
NODE_ENV=development

# Auth
AUTH_ENABLED=false
AUTH_TYPE=dev-token

# CORS
CORS_ORIGINS=*
CORS_CREDENTIALS=true

# Rate Limit (IMPORTANTE!)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
RATE_LIMIT_SKIP_SUCCESS=false

# Admin
ADMIN_ENABLED=true
```

**Nota**: `RATE_LIMIT_SKIP_SUCCESS` é obrigatório! Não use `RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS`.

#### 3. Limpe e reinicie

```bash
# Pare o servidor (Ctrl+C)

# Limpe o build
npm run clean

# Reinstale dependências (se necessário)
rm -rf node_modules
npm install

# Inicie novamente
npm run dev
```

## ❌ Erro: "Environment validation failed"

### Sintoma
```
Error: Environment validation failed: "VARIABLE_NAME" is required
```

### Solução

Adicione a variável faltando no `.env`:

```bash
# Veja qual variável está faltando no erro
# Adicione ela no .env

# Exemplo:
echo "VARIABLE_NAME=value" >> .env
```

## ❌ Erro: "Port 3000 is already in use"

### Sintoma
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solução

#### Opção 1: Mude a porta

```bash
# Edite .env
PORT=8080

# Ou use variável de ambiente
PORT=8080 npm run dev
```

#### Opção 2: Mate o processo na porta 3000

```bash
# Linux/macOS
lsof -i :3000
kill -9 <PID>

# Ou use o script
./kill-port.sh 3000

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## ❌ Erro: "Cannot find module"

### Sintoma
```
Error: Cannot find module './handlers/DashboardHandler'
```

### Solução

```bash
# Rebuild o projeto
npm run clean
npm run build

# Ou use dev mode
npm run dev
```

## ❌ Erro: "CORS policy"

### Sintoma
No navegador:
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:8080' 
has been blocked by CORS policy
```

### Solução

```bash
# Edite .env
CORS_ORIGINS=*

# Ou especifique sua origem
CORS_ORIGINS=http://localhost:8080,http://localhost:3000

# Reinicie o servidor
```

## ❌ Erro: "Authentication required"

### Sintoma
```
{"error":"Unauthorized"}
```

### Solução

```bash
# Desabilite auth para desenvolvimento
# Edite .env
AUTH_ENABLED=false

# Ou use dev-token simples
AUTH_TYPE=dev-token
DEV_TOKEN=meu-token-123

# Reinicie o servidor
```

## ❌ Dashboard não carrega

### Sintoma
- Página em branco
- 404 Not Found
- Erro de CORS

### Solução

```bash
# 1. Verifique se admin está habilitado
grep ADMIN_ENABLED .env
# Deve mostrar: ADMIN_ENABLED=true

# 2. Verifique se o servidor está rodando
curl http://localhost:3000/admin/health

# 3. Desabilite auth temporariamente
# Edite .env
AUTH_ENABLED=false

# 4. Reinicie
npm run dev

# 5. Acesse
open http://localhost:3000/dashboard
```

## ❌ GraphQL Playground não abre

### Sintoma
- 404 ao acessar /graphql
- Playground não carrega

### Solução

```bash
# 1. Verifique se GraphQL está habilitado
grep GRAPHQL_ENABLED .env
# Deve mostrar: GRAPHQL_ENABLED=true

# 2. Verifique se playground está habilitado
grep GRAPHQL_PLAYGROUND .env
# Deve mostrar: GRAPHQL_PLAYGROUND=true

# 3. Adicione se não existir
echo "GRAPHQL_ENABLED=true" >> .env
echo "GRAPHQL_PLAYGROUND=true" >> .env

# 4. Reinicie
npm run dev
```

## ❌ WebSocket não conecta

### Sintoma
- Connection failed
- WebSocket error

### Solução

```bash
# 1. Verifique se WebSocket está habilitado
grep WEBSOCKET_ENABLED .env
# Deve mostrar: WEBSOCKET_ENABLED=true

# 2. Adicione se não existir
echo "WEBSOCKET_ENABLED=true" >> .env

# 3. Verifique a URL
# Deve ser: ws://localhost:3000/ws (não wss://)

# 4. Reinicie
npm run dev
```

## 🔧 Script de Diagnóstico

Crie um script para verificar a configuração:

```bash
#!/bin/bash
# check-config.sh

echo "Verificando configuração..."
echo ""

# Verifica .env
if [ ! -f .env ]; then
    echo "❌ .env não encontrado!"
    echo "Execute: cp .env.local .env"
    exit 1
fi

echo "✅ .env encontrado"

# Verifica variáveis obrigatórias
required_vars=(
    "PORT"
    "NODE_ENV"
    "AUTH_ENABLED"
    "CORS_ORIGINS"
    "RATE_LIMIT_WINDOW"
    "RATE_LIMIT_MAX"
    "RATE_LIMIT_SKIP_SUCCESS"
    "ADMIN_ENABLED"
)

missing=0
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "❌ $var não encontrado no .env"
        missing=1
    else
        echo "✅ $var encontrado"
    fi
done

if [ $missing -eq 1 ]; then
    echo ""
    echo "Corrija o .env e tente novamente"
    exit 1
fi

echo ""
echo "✅ Configuração OK!"
```

Use:
```bash
chmod +x check-config.sh
./check-config.sh
```

## 📋 Checklist de Inicialização

Antes de iniciar o servidor, verifique:

- [ ] `.env` existe
- [ ] Todas as variáveis obrigatórias estão definidas
- [ ] `node_modules` instalado (`npm install`)
- [ ] Porta 3000 está livre
- [ ] Node.js 18+ instalado

## 🆘 Ainda com problemas?

### 1. Logs detalhados

```bash
# Ative debug logging
echo "LOG_LEVEL=debug" >> .env
npm run dev
```

### 2. Teste health check

```bash
curl http://localhost:3000/admin/health
```

Deve retornar:
```json
{"status":"ok","uptime":123,"timestamp":"..."}
```

### 3. Verifique versões

```bash
node --version  # Deve ser 18+
npm --version
```

### 4. Reinstale tudo

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run dev
```

### 5. Use .env.local limpo

```bash
cp .env.local .env
npm run dev
```

## 📚 Documentação Relacionada

- [START_GUIDE.md](START_GUIDE.md) - Guia de inicialização
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - Guia dos frontends
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Troubleshooting geral

---

**Dica**: Sempre comece com `.env.local` limpo quando tiver problemas!
