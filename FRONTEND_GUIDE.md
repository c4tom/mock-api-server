# Frontend Guide - Mock API Server

Guia completo para usar as interfaces web do Mock API Server.

## Índice

1. [Dashboard Web](#dashboard-web)
2. [WebSocket Test Client](#websocket-test-client)
3. [GraphQL Playground](#graphql-playground)
4. [Configuração](#configuração)

## Dashboard Web

### O que é?

Dashboard web completo para monitoramento em tempo real do servidor, com:
- Métricas ao vivo (uptime, requests, erros, performance)
- Histórico de requisições
- Visualização de configuração
- Gráficos e analytics

### Como acessar?

#### 1. Certifique-se que o servidor está rodando

```bash
npm run dev
```

#### 2. Abra no navegador

```
http://localhost:3000/dashboard
```

Se mudou a porta, use: `http://localhost:SUA_PORTA/dashboard`

### Configuração necessária

No arquivo `.env`:

```env
# Habilitar admin endpoints (necessário para dashboard)
ADMIN_ENABLED=true

# Opcional: Desabilitar autenticação para desenvolvimento
AUTH_ENABLED=false

# OU usar autenticação simples
AUTH_TYPE=dev-token
DEV_TOKEN=meu-token-123
```

### Funcionalidades do Dashboard

#### 📊 Métricas em Tempo Real

Cards no topo mostram:
- **Server Status**: Tempo online
- **Total Requests**: Número de requisições
- **Error Rate**: Taxa de erros (%)
- **Avg Response Time**: Tempo médio de resposta (ms)
- **Memory Usage**: Uso de memória (MB)

Atualiza automaticamente a cada 5 segundos.

#### 📋 Abas do Dashboard

**1. Recent Requests**
- Últimas 50 requisições
- Informações: timestamp, método, path, status, tempo de resposta, IP
- Cores por método HTTP (GET=azul, POST=verde, PUT=amarelo, DELETE=vermelho)
- Indicadores de status (sucesso=verde, erro=vermelho)

**2. Configuration**
- Visualização da configuração atual
- Dados sensíveis mascarados automaticamente
- Botão "Reload Config" para recarregar sem reiniciar
- Formato JSON formatado

**3. Analytics**
- **Response Time Chart**: Gráfico de linha com tempos de resposta
- **Top Requested Paths**: Endpoints mais acessados
- **Status Code Distribution**: Distribuição por categoria (2xx, 3xx, 4xx, 5xx)
- Gráficos interativos com Chart.js

### Screenshots das Funcionalidades

#### Métricas
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Server Status   │ Total Requests  │ Error Rate      │
│ 🟢 2h 15m 30s  │ 1,234           │ 2.5%            │
├─────────────────┼─────────────────┼─────────────────┤
│ Avg Response    │ Memory Usage    │                 │
│ 45ms            │ 128 MB          │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

#### Tabela de Requisições
```
Time       Method  Path              Status  Time    IP
10:30:45   GET     /api/users        200     23ms    127.0.0.1
10:30:44   POST    /api/products     201     45ms    127.0.0.1
10:30:43   GET     /api/orders       200     18ms    192.168.1.5
```

### Usando com Autenticação

Se `AUTH_ENABLED=true`, você precisa autenticar:

#### Dev Token
```env
AUTH_TYPE=dev-token
DEV_TOKEN=meu-token-123
```

Acesse normalmente no navegador. O dashboard pedirá o token na primeira vez.

#### JWT
```env
AUTH_TYPE=jwt
JWT_SECRET=seu-secret
```

Você precisará fazer login primeiro em um endpoint de autenticação (implementar seu próprio).

#### HTTP Basic
```env
AUTH_TYPE=basic
BASIC_USERNAME=admin
BASIC_PASSWORD=senha123
```

O navegador pedirá usuário e senha automaticamente.

### API do Dashboard

O dashboard usa endpoints REST que você também pode chamar:

```bash
# Métricas
curl http://localhost:3000/dashboard/api/metrics

# Requisições recentes
curl http://localhost:3000/dashboard/api/requests

# Configuração
curl http://localhost:3000/dashboard/api/config
```

Com autenticação:
```bash
curl -H "Authorization: Bearer meu-token-123" \
  http://localhost:3000/dashboard/api/metrics
```

## WebSocket Test Client

### O que é?

Cliente HTML interativo para testar funcionalidades WebSocket do servidor.

### Como acessar?

#### Opção 1: Abrir arquivo diretamente

```bash
# No navegador, abra o arquivo
open docs/websocket-test-client.html

# Ou no Linux
xdg-open docs/websocket-test-client.html

# Ou Windows
start docs/websocket-test-client.html
```

#### Opção 2: Servir via HTTP

```bash
# Usando Python
cd docs
python3 -m http.server 8080

# Acesse: http://localhost:8080/websocket-test-client.html
```

### Configuração necessária

No arquivo `.env`:

```env
# Habilitar WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3000

# Mock events (opcional)
WEBSOCKET_MOCK_EVENTS_ENABLED=true
```

Crie eventos mock em `data/websocket-events.json`:

```json
{
  "events": [
    {
      "name": "ticker",
      "interval": 1000,
      "data": {
        "symbol": "BTC",
        "price": 50000,
        "change": "+2.5%"
      }
    },
    {
      "name": "notifications",
      "interval": 5000,
      "data": {
        "message": "Nova notificação",
        "type": "info"
      }
    }
  ]
}
```

### Usando o Test Client

#### 1. Conectar ao servidor

```
WebSocket URL: ws://localhost:3000/ws
```

Clique em "Connect"

#### 2. Enviar mensagens

**Subscribe a um evento:**
```json
{
  "type": "subscribe",
  "event": "ticker"
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "event": "ticker"
}
```

**Ping:**
```json
{
  "type": "ping"
}
```

**Request evento único:**
```json
{
  "type": "request",
  "event": "ticker"
}
```

#### 3. Ver mensagens recebidas

O painel inferior mostra todas as mensagens recebidas em tempo real:

```json
{
  "type": "event",
  "event": "ticker",
  "data": {
    "symbol": "BTC",
    "price": 50000,
    "change": "+2.5%"
  },
  "timestamp": 1697123456789
}
```

### Funcionalidades do Test Client

- ✅ Conectar/Desconectar WebSocket
- ✅ Enviar mensagens customizadas
- ✅ Subscribe/Unsubscribe eventos
- ✅ Ver histórico de mensagens
- ✅ Limpar console
- ✅ Status de conexão visual
- ✅ Timestamps em todas as mensagens
- ✅ Syntax highlighting JSON

### Testando Proxy WebSocket

Configure proxy no `.env`:

```env
WEBSOCKET_PROXY_ENABLED=true
WEBSOCKET_PROXY_ROUTES=binance:wss://stream.binance.com:9443
```

No test client, conecte a:
```
ws://localhost:3000/ws/proxy/binance/ws/btcusdt@ticker
```

## GraphQL Playground

### O que é?

Interface web interativa para testar queries e mutations GraphQL.

### Como acessar?

```
http://localhost:3000/graphql
```

### Configuração necessária

No arquivo `.env`:

```env
# Habilitar GraphQL
GRAPHQL_ENABLED=true

# Opcional: Schema customizado
GRAPHQL_SCHEMA_PATH=./data/graphql-schema.graphql
```

### Usando o Playground

#### 1. Escrever Query

No painel esquerdo:

```graphql
query {
  users {
    id
    name
    email
  }
}
```

#### 2. Executar

Clique no botão "Play" ▶️ ou pressione `Ctrl+Enter`

#### 3. Ver Resultado

Painel direito mostra o resultado:

```json
{
  "data": {
    "users": [
      {
        "id": "1",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ]
  }
}
```

### Funcionalidades do Playground

- ✅ Autocomplete de queries
- ✅ Syntax highlighting
- ✅ Schema explorer (Docs)
- ✅ Query history
- ✅ Variables support
- ✅ Headers customizados
- ✅ Prettify query

### Exemplo com Variáveis

Query:
```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}
```

Variables (painel inferior):
```json
{
  "id": "1"
}
```

### Exemplo com Mutation

```graphql
mutation CreateUser($input: UserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}
```

Variables:
```json
{
  "input": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### Usando com Autenticação

Se autenticação está habilitada, adicione headers:

No painel "HTTP Headers" (canto inferior):

```json
{
  "Authorization": "Bearer seu-token-aqui"
}
```

### GraphQL Proxy

Para proxiar para API externa:

```env
GRAPHQL_PROXY_ENABLED=true
GRAPHQL_PROXY_URL=https://api.example.com/graphql
GRAPHQL_PROXY_HEADERS=Authorization:Bearer token123
```

O playground automaticamente usa o proxy configurado.

## Configuração

### Configuração Completa para Todos os Frontends

Arquivo `.env` recomendado para desenvolvimento:

```env
# Server
PORT=3000
NODE_ENV=development

# Autenticação (desabilitada para facilitar)
AUTH_ENABLED=false

# Admin & Dashboard
ADMIN_ENABLED=true

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_MOCK_EVENTS_ENABLED=true

# GraphQL
GRAPHQL_ENABLED=true
GRAPHQL_PLAYGROUND_ENABLED=true

# CORS (permitir todos para desenvolvimento)
CORS_ORIGINS=*

# Logging
LOG_LEVEL=debug
LOG_FORMAT=simple
```

### Acessos Rápidos

Depois de iniciar o servidor (`npm run dev`):

```bash
# Dashboard
open http://localhost:3000/dashboard

# WebSocket Test Client
open docs/websocket-test-client.html

# GraphQL Playground
open http://localhost:3000/graphql

# Admin Health Check
curl http://localhost:3000/admin/health
```

### Troubleshooting

#### Dashboard não carrega

**Problema**: Página em branco ou 404

**Soluções**:
- Verifique `ADMIN_ENABLED=true` no `.env`
- Reinicie o servidor
- Verifique logs: `tail -f logs/app.log`
- Tente desabilitar auth: `AUTH_ENABLED=false`

#### WebSocket não conecta

**Problema**: Connection failed no test client

**Soluções**:
- Verifique `WEBSOCKET_ENABLED=true`
- URL correta: `ws://localhost:3000/ws` (não `wss://`)
- Verifique firewall não está bloqueando
- Teste com: `wscat -c ws://localhost:3000/ws`

#### GraphQL Playground não abre

**Problema**: 404 ou erro ao acessar /graphql

**Soluções**:
- Verifique `GRAPHQL_ENABLED=true`
- Verifique `GRAPHQL_PLAYGROUND_ENABLED=true`
- Reinicie o servidor
- Verifique porta está correta

#### Erro de autenticação

**Problema**: 401 Unauthorized em qualquer frontend

**Soluções**:
- Desabilite temporariamente: `AUTH_ENABLED=false`
- Use dev-token simples: `AUTH_TYPE=dev-token`
- Verifique token está correto
- Limpe cookies do navegador

#### CORS Error no navegador

**Problema**: CORS policy error no console

**Soluções**:
- Configure `CORS_ORIGINS=*` para desenvolvimento
- Ou adicione sua origem: `CORS_ORIGINS=http://localhost:8080`
- Verifique `CORS_CREDENTIALS=true` se usando cookies

## Dicas de Uso

### Desenvolvimento Frontend

Se está desenvolvendo um frontend que consome a API:

1. **Use o Dashboard** para monitorar requisições em tempo real
2. **Use o GraphQL Playground** para testar queries antes de implementar
3. **Use o WebSocket Test Client** para validar eventos antes de integrar

### Demonstrações

Para demonstrar o projeto:

1. Abra o **Dashboard** em uma tela
2. Abra o **WebSocket Test Client** em outra
3. Faça requisições e veja aparecer no dashboard em tempo real
4. Subscribe a eventos WebSocket e veja updates ao vivo

### Testes

Para testar funcionalidades:

1. **Dashboard**: Verifique métricas e performance
2. **WebSocket Client**: Teste eventos e subscriptions
3. **GraphQL Playground**: Valide schema e queries

## Recursos Adicionais

### Documentação Relacionada

- [Dashboard Guide](docs/DASHBOARD_GUIDE.md) - Detalhes completos do dashboard
- [WebSocket Guide](docs/WEBSOCKET_GUIDE.md) - Documentação WebSocket
- [GraphQL Guide](docs/GRAPHQL_GUIDE.md) - Documentação GraphQL
- [User Guide](USER_GUIDE.md) - Guia geral de uso

### Exemplos

- [examples/dashboard-usage.md](examples/dashboard-usage.md) - Exemplos de uso do dashboard
- [examples/websocket-client-example.js](examples/websocket-client-example.js) - Cliente WebSocket em Node.js
- [examples/graphql-client-example.js](examples/graphql-client-example.js) - Cliente GraphQL

### Vídeos e Tutoriais

Crie seus próprios tutoriais usando os frontends para demonstrar:
- Como monitorar APIs em tempo real
- Como testar WebSocket durante desenvolvimento
- Como explorar schemas GraphQL

---

Aproveite os frontends! 🎨✨
