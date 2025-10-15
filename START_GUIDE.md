# Guia de Inicialização - Mock API Server

Guia rápido para iniciar o servidor e todos os frontends.

## 🚀 Início Rápido

### Opção 1: Script Automático (Recomendado)

#### Linux/macOS
```bash
./start-all.sh
```

#### Windows
```cmd
start-all.bat
```

**O que faz:**
- ✅ Verifica e cria `.env` se necessário
- ✅ Instala dependências se necessário
- ✅ Inicia o servidor
- ✅ Abre automaticamente:
  - Dashboard (http://localhost:3000/dashboard)
  - GraphQL Playground (http://localhost:3000/graphql)
  - WebSocket Test Client (docs/websocket-test-client.html)

### Opção 2: Manual

```bash
# 1. Configure o ambiente (primeira vez)
cp .env.local .env

# 2. Instale dependências (primeira vez)
npm install

# 3. Inicie o servidor
npm run dev

# 4. Abra os frontends manualmente
# - Dashboard: http://localhost:3000/dashboard
# - GraphQL: http://localhost:3000/graphql
# - WebSocket: docs/websocket-test-client.html
```

### Opção 3: Usando npm scripts

```bash
# Iniciar servidor
npm run dev

# Em outro terminal, abrir frontends
npm run open:dashboard
npm run open:graphql
npm run open:websocket
```

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou pnpm instalado
- Porta 3000 disponível

## 🎯 O que é iniciado?

### Backend (Servidor)

O servidor Express.js que fornece:
- ✅ Mock Data API
- ✅ CORS Proxy
- ✅ WebSocket Server
- ✅ GraphQL Endpoint
- ✅ Admin Endpoints

**Porta**: 3000 (padrão)

### Frontends (Interfaces Web)

#### 1. Dashboard Web
- **URL**: http://localhost:3000/dashboard
- **Descrição**: Interface de monitoramento em tempo real
- **Features**:
  - Métricas do servidor (uptime, requests, erros)
  - Histórico de requisições
  - Visualização de configuração
  - Gráficos de analytics

#### 2. GraphQL Playground
- **URL**: http://localhost:3000/graphql
- **Descrição**: Editor interativo de queries GraphQL
- **Features**:
  - Editor com autocomplete
  - Schema explorer
  - Query history
  - Teste de queries e mutations

#### 3. WebSocket Test Client
- **Arquivo**: docs/websocket-test-client.html
- **Descrição**: Cliente de teste para WebSocket
- **Features**:
  - Conectar/desconectar WebSocket
  - Subscribe/unsubscribe eventos
  - Enviar mensagens customizadas
  - Ver histórico de mensagens

## ⚙️ Configuração

### Arquivo .env

O script automático cria o `.env` baseado em `.env.local`, mas você pode customizar:

```env
# Server
PORT=3000
NODE_ENV=development

# Desabilitar auth para facilitar
AUTH_ENABLED=false

# Habilitar todos os recursos
ADMIN_ENABLED=true
WEBSOCKET_ENABLED=true
GRAPHQL_ENABLED=true
GRAPHQL_PLAYGROUND_ENABLED=true

# CORS permissivo para desenvolvimento
CORS_ORIGINS=*

# Logging
LOG_LEVEL=debug
```

### Mudando a Porta

Se a porta 3000 estiver ocupada:

```bash
# Edite .env
PORT=8080

# Ou use variável de ambiente
PORT=8080 npm run dev
```

Depois acesse:
- Dashboard: http://localhost:8080/dashboard
- GraphQL: http://localhost:8080/graphql

## 🔧 Comandos Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor (modo desenvolvimento)
npm run dev

# Iniciar com watch (reinicia ao salvar)
npm run dev:watch

# Iniciar tudo (alias para dev)
npm run dev:full
```

### Produção

```bash
# Build e start
npm run start:full

# Ou separado
npm run build
npm start
```

### Abrir Frontends

```bash
# Abrir dashboard
npm run open:dashboard

# Abrir GraphQL playground
npm run open:graphql

# Abrir WebSocket client
npm run open:websocket
```

### Testes

```bash
# Rodar testes
npm test

# Testes em watch mode
npm test:watch

# Lint
npm run lint
npm run lint:fix
```

## 🐛 Troubleshooting

### Porta 3000 já está em uso

```bash
# Encontre o processo
lsof -i :3000  # Linux/macOS
netstat -ano | findstr :3000  # Windows

# Mate o processo ou mude a porta
PORT=8080 npm run dev
```

### Erro ao iniciar

```bash
# Limpe e reinstale
rm -rf node_modules package-lock.json
npm install

# Limpe build anterior
npm run clean
npm run build
```

### Frontends não abrem automaticamente

Abra manualmente no navegador:
- http://localhost:3000/dashboard
- http://localhost:3000/graphql
- Abra o arquivo: docs/websocket-test-client.html

### Erro de permissão no script

```bash
# Linux/macOS
chmod +x start-all.sh
./start-all.sh
```

### .env não encontrado

```bash
# Copie o template
cp .env.local .env

# Ou crie manualmente
cat > .env << EOF
PORT=3000
NODE_ENV=development
AUTH_ENABLED=false
ADMIN_ENABLED=true
WEBSOCKET_ENABLED=true
GRAPHQL_ENABLED=true
CORS_ORIGINS=*
EOF
```

## 📊 Verificando se está funcionando

### 1. Verificar servidor

```bash
# Health check
curl http://localhost:3000/admin/health

# Deve retornar:
# {"status":"ok","uptime":123,"timestamp":...}
```

### 2. Verificar Dashboard

Abra http://localhost:3000/dashboard e veja:
- ✅ Métricas aparecendo
- ✅ Servidor online (indicador verde)
- ✅ Uptime contando

### 3. Verificar GraphQL

Abra http://localhost:3000/graphql e:
- ✅ Playground carrega
- ✅ Pode ver schema na aba "Docs"
- ✅ Pode executar queries

### 4. Verificar WebSocket

Abra docs/websocket-test-client.html e:
- ✅ Conecte a ws://localhost:3000/ws
- ✅ Status mostra "Connected"
- ✅ Pode enviar mensagens

## 🎯 Fluxo de Trabalho Recomendado

### Para Desenvolvimento

```bash
# 1. Inicie tudo
./start-all.sh

# 2. Desenvolva seu frontend/app
# 3. Monitore no dashboard
# 4. Teste WebSocket/GraphQL conforme necessário

# 5. Pare com Ctrl+C
```

### Para Demonstração

```bash
# 1. Inicie o servidor
npm run dev

# 2. Abra em abas separadas:
# - Dashboard para mostrar métricas
# - GraphQL para mostrar queries
# - WebSocket para mostrar real-time

# 3. Faça requisições e mostre aparecer no dashboard
```

### Para Testes

```bash
# 1. Configure dados de teste
# Edite arquivos em data/mock/

# 2. Inicie servidor
npm run dev

# 3. Use os frontends para testar
# - Dashboard: veja requisições
# - GraphQL: teste queries
# - WebSocket: teste eventos

# 4. Rode testes automatizados
npm test
```

## 📚 Próximos Passos

Depois de iniciar tudo:

1. **Leia a documentação**:
   - [USER_GUIDE.md](USER_GUIDE.md) - Como usar
   - [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - Detalhes dos frontends
   - [QUICK_START_FRONTEND.md](QUICK_START_FRONTEND.md) - Quick start

2. **Explore os exemplos**:
   - [examples/](examples/) - Exemplos práticos

3. **Configure conforme necessário**:
   - [docs/CONFIG_EXAMPLES.md](docs/CONFIG_EXAMPLES.md) - Exemplos de configuração

## 🆘 Precisa de Ajuda?

- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Resolução de problemas
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Índice completo
- [README.md](README.md) - Documentação completa

## 💡 Dicas

### Desenvolvimento Rápido

```bash
# Terminal 1: Servidor com watch
npm run dev:watch

# Terminal 2: Testes em watch
npm test:watch

# Navegador: Dashboard aberto
# http://localhost:3000/dashboard
```

### Múltiplas Instâncias

```bash
# Instância 1 (porta 3000)
npm run dev

# Instância 2 (porta 3001)
PORT=3001 npm run dev

# Instância 3 (porta 3002)
PORT=3002 npm run dev
```

### Docker (Futuro)

```bash
# Build
docker build -t mock-api-server .

# Run
docker run -p 3000:3000 mock-api-server

# Acesse normalmente
# http://localhost:3000/dashboard
```

---

**Pronto para começar?** Execute `./start-all.sh` e divirta-se! 🚀
