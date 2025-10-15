# Quick Start - Frontends

Guia rápido para acessar as interfaces web do Mock API Server.

## 🚀 Início Rápido

### 1. Inicie o servidor

```bash
# Configure
cp .env.local .env

# Inicie
npm run dev
```

### 2. Acesse os frontends

```bash
# Dashboard de Monitoramento
open http://localhost:3000/dashboard

# GraphQL Playground
open http://localhost:3000/graphql

# WebSocket Test Client
open docs/websocket-test-client.html
```

## 📊 Dashboard

**URL**: `http://localhost:3000/dashboard`

**O que faz**:
- Monitora servidor em tempo real
- Mostra métricas (uptime, requests, erros, performance)
- Lista requisições recentes
- Visualiza configuração
- Gráficos de analytics

**Configuração mínima** (`.env`):
```env
ADMIN_ENABLED=true
AUTH_ENABLED=false  # Para facilitar desenvolvimento
```

**Screenshot**:
```
┌─────────────────────────────────────────────────────┐
│  Mock API Server Dashboard                          │
├─────────────────────────────────────────────────────┤
│  🟢 Server Status    📊 Total Requests   ⚠️ Errors  │
│     2h 15m 30s          1,234              2.5%     │
│                                                      │
│  ⏱️ Avg Response     💾 Memory Usage                │
│     45ms                128 MB                       │
├─────────────────────────────────────────────────────┤
│  [Recent Requests] [Configuration] [Analytics]      │
│                                                      │
│  Time      Method  Path           Status  Time      │
│  10:30:45  GET     /api/users     200     23ms      │
│  10:30:44  POST    /api/products  201     45ms      │
└─────────────────────────────────────────────────────┘
```

## 🔮 GraphQL Playground

**URL**: `http://localhost:3000/graphql`

**O que faz**:
- Interface interativa para GraphQL
- Autocomplete de queries
- Explorador de schema
- Testa queries e mutations

**Configuração mínima** (`.env`):
```env
GRAPHQL_ENABLED=true
GRAPHQL_PLAYGROUND_ENABLED=true
```

**Exemplo de uso**:
```graphql
query {
  users {
    id
    name
    email
  }
}
```

**Screenshot**:
```
┌─────────────────────────────────────────────────────┐
│  GraphQL Playground                                  │
├──────────────────────┬──────────────────────────────┤
│  Query               │  Result                      │
│                      │                              │
│  query {             │  {                           │
│    users {           │    "data": {                 │
│      id              │      "users": [              │
│      name            │        {                     │
│      email           │          "id": "1",          │
│    }                 │          "name": "John"      │
│  }                   │        }                     │
│                      │      ]                       │
│  [▶ Execute]         │    }                         │
│                      │  }                           │
├──────────────────────┴──────────────────────────────┤
│  Variables           │  Headers                     │
└─────────────────────────────────────────────────────┘
```

## 🔌 WebSocket Test Client

**Arquivo**: `docs/websocket-test-client.html`

**Como abrir**:
```bash
# Opção 1: Abrir diretamente
open docs/websocket-test-client.html

# Opção 2: Servir via HTTP
cd docs && python3 -m http.server 8080
# Acesse: http://localhost:8080/websocket-test-client.html
```

**O que faz**:
- Testa conexões WebSocket
- Subscribe/unsubscribe eventos
- Envia mensagens customizadas
- Mostra mensagens recebidas em tempo real

**Configuração mínima** (`.env`):
```env
WEBSOCKET_ENABLED=true
WEBSOCKET_MOCK_EVENTS_ENABLED=true
```

**Exemplo de uso**:

1. Conecte: `ws://localhost:3000/ws`
2. Subscribe a evento:
```json
{
  "type": "subscribe",
  "event": "ticker"
}
```
3. Veja mensagens chegando em tempo real

**Screenshot**:
```
┌─────────────────────────────────────────────────────┐
│  WebSocket Test Client                               │
├─────────────────────────────────────────────────────┤
│  Connection                                          │
│  URL: ws://localhost:3000/ws                        │
│  Status: 🟢 Connected                               │
│  [Disconnect]                                        │
├─────────────────────────────────────────────────────┤
│  Send Message                                        │
│  {                                                   │
│    "type": "subscribe",                             │
│    "event": "ticker"                                │
│  }                                                   │
│  [Send]                                             │
├─────────────────────────────────────────────────────┤
│  Messages                                            │
│  ← {"type":"event","event":"ticker","data":{...}}   │
│  ← {"type":"event","event":"ticker","data":{...}}   │
│  [Clear]                                            │
└─────────────────────────────────────────────────────┘
```

## 🎯 Casos de Uso

### Desenvolvimento Frontend

```bash
# 1. Inicie o servidor
npm run dev

# 2. Abra o dashboard para monitorar
open http://localhost:3000/dashboard

# 3. Desenvolva seu frontend fazendo requisições
# 4. Veja as requisições aparecerem no dashboard em tempo real
```

### Teste de WebSocket

```bash
# 1. Configure eventos mock em data/websocket-events.json
# 2. Inicie o servidor
npm run dev

# 3. Abra o test client
open docs/websocket-test-client.html

# 4. Conecte e subscribe aos eventos
# 5. Veja os eventos chegando em tempo real
```

### Exploração de GraphQL

```bash
# 1. Configure schema em data/graphql-schema.graphql
# 2. Inicie o servidor
npm run dev

# 3. Abra o playground
open http://localhost:3000/graphql

# 4. Explore o schema na aba "Docs"
# 5. Teste queries e mutations
```

## ⚙️ Configuração Completa

Para habilitar todos os frontends, use este `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Desabilitar auth para facilitar
AUTH_ENABLED=false

# Dashboard
ADMIN_ENABLED=true

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_MOCK_EVENTS_ENABLED=true

# GraphQL
GRAPHQL_ENABLED=true
GRAPHQL_PLAYGROUND_ENABLED=true

# CORS
CORS_ORIGINS=*

# Logging
LOG_LEVEL=debug
```

## 🔧 Troubleshooting Rápido

### Dashboard não abre
```bash
# Verifique se admin está habilitado
grep ADMIN_ENABLED .env
# Deve mostrar: ADMIN_ENABLED=true

# Reinicie o servidor
npm run dev
```

### WebSocket não conecta
```bash
# Verifique se WebSocket está habilitado
grep WEBSOCKET_ENABLED .env
# Deve mostrar: WEBSOCKET_ENABLED=true

# Teste a conexão
wscat -c ws://localhost:3000/ws
```

### GraphQL Playground não abre
```bash
# Verifique se GraphQL está habilitado
grep GRAPHQL_ENABLED .env
# Deve mostrar: GRAPHQL_ENABLED=true

# Verifique se playground está habilitado
grep GRAPHQL_PLAYGROUND_ENABLED .env
# Deve mostrar: GRAPHQL_PLAYGROUND_ENABLED=true
```

### Erro 401 (Unauthorized)
```bash
# Desabilite autenticação temporariamente
echo "AUTH_ENABLED=false" >> .env

# Reinicie o servidor
npm run dev
```

## 📚 Documentação Completa

Para mais detalhes, veja:
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - Guia completo dos frontends
- [USER_GUIDE.md](USER_GUIDE.md) - Guia de uso geral
- [docs/DASHBOARD_GUIDE.md](docs/DASHBOARD_GUIDE.md) - Detalhes do dashboard
- [docs/WEBSOCKET_GUIDE.md](docs/WEBSOCKET_GUIDE.md) - Detalhes WebSocket
- [docs/GRAPHQL_GUIDE.md](docs/GRAPHQL_GUIDE.md) - Detalhes GraphQL

## 🎉 Pronto!

Agora você tem acesso a:
- ✅ Dashboard de monitoramento em tempo real
- ✅ GraphQL Playground interativo
- ✅ WebSocket Test Client

Divirta-se! 🚀
