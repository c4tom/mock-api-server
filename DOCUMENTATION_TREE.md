# Documentation Tree

Árvore visual completa da documentação do Mock API Server.

## 📁 Estrutura de Arquivos

```
mock-api-server/
│
├── 📖 DOCUMENTAÇÃO PRINCIPAL (Raiz)
│   ├── README.md                      ⭐ Documentação completa (600 linhas)
│   ├── README-SHORT.md                🚀 Referência rápida (80 linhas)
│   ├── USER_GUIDE.md                  👤 Manual do usuário (700 linhas)
│   ├── FRONTEND_GUIDE.md              🎨 Guia dos frontends (600 linhas)
│   ├── QUICK_START_FRONTEND.md        ⚡ Quick start frontends (250 linhas)
│   ├── DEVELOPER_GUIDE.md             👨‍💻 Guia do desenvolvedor (800 linhas)
│   ├── DOCUMENTATION_INDEX.md         📇 Índice completo (300 linhas)
│   └── DOCUMENTATION_TREE.md          🌳 Esta árvore
│
├── 📂 docs/ - DOCUMENTAÇÃO DETALHADA
│   │
│   ├── 📚 GUIAS DE FEATURES
│   │   ├── API_REFERENCE.md                    📋 Referência completa da API
│   │   ├── CACHE_GUIDE.md                      💾 Guia de cache
│   │   ├── DASHBOARD_GUIDE.md                  📊 Guia do dashboard
│   │   ├── DATA_GENERATION_GUIDE.md            🎲 Guia de geração de dados
│   │   ├── DATABASE_GUIDE.md                   🗄️ Guia de banco de dados
│   │   ├── GRAPHQL_GUIDE.md                    🔮 Guia GraphQL
│   │   ├── PERFORMANCE_MONITORING_GUIDE.md     📈 Guia de monitoramento
│   │   ├── PROXY_GUIDE.md                      🔄 Guia de proxy
│   │   ├── RECORDING_GUIDE.md                  📹 Guia de gravação
│   │   ├── TRANSFORMATION_GUIDE.md             🔀 Guia de transformações
│   │   ├── VERSIONING_GUIDE.md                 📌 Guia de versionamento
│   │   └── WEBSOCKET_GUIDE.md                  🔌 Guia WebSocket
│   │
│   ├── 🔧 CONFIGURAÇÃO E SEGURANÇA
│   │   ├── CONFIG_EXAMPLES.md                  ⚙️ Exemplos de configuração
│   │   ├── SECURITY_GUIDE.md                   🛡️ Guia de segurança
│   │   └── TROUBLESHOOTING.md                  🐛 Resolução de problemas
│   │
│   ├── 📝 IMPLEMENTATION SUMMARIES
│   │   ├── API_VERSIONING_IMPLEMENTATION_SUMMARY.md
│   │   ├── DASHBOARD_IMPLEMENTATION_SUMMARY.md
│   │   ├── DATA_GENERATION_IMPLEMENTATION_SUMMARY.md
│   │   ├── DATABASE_IMPLEMENTATION_SUMMARY.md
│   │   ├── GRAPHQL_IMPLEMENTATION_SUMMARY.md
│   │   ├── PERFORMANCE_MONITORING_IMPLEMENTATION_SUMMARY.md
│   │   ├── TRANSFORMATION_IMPLEMENTATION_SUMMARY.md
│   │   └── WEBSOCKET_IMPLEMENTATION_SUMMARY.md
│   │
│   ├── 📖 REFERÊNCIAS RÁPIDAS
│   │   ├── PERFORMANCE_MONITORING_QUICK_REFERENCE.md
│   │   ├── VERSIONING_QUICK_START.md
│   │   └── WEBSOCKET_CHECKLIST.md
│   │
│   ├── 🎨 INTERFACES WEB
│   │   └── websocket-test-client.html          🔌 Cliente de teste WebSocket
│   │
│   ├── 📊 SUMÁRIOS
│   │   ├── README.md                           📄 Índice do docs/
│   │   └── DOCUMENTATION_SUMMARY.md            📊 Resumo executivo
│   │
│   └── 🧪 TESTES E OUTROS
│       ├── test-database-feature.md
│       └── prompt.md
│
├── 📂 examples/ - EXEMPLOS PRÁTICOS
│   ├── dashboard-usage.md                      📊 Uso do dashboard
│   ├── database-sqlite-example.md              🗄️ Exemplo SQLite
│   ├── data-generation-example.md              🎲 Exemplo geração de dados
│   ├── graphql-client-example.js               🔮 Cliente GraphQL
│   ├── websocket-client-example.js             🔌 Cliente WebSocket
│   ├── versioning-example.md                   📌 Exemplo versionamento
│   └── README.md                               📄 Índice de exemplos
│
├── 📂 data/ - DADOS E TEMPLATES
│   ├── mock/                                   📁 Dados mock
│   ├── templates/                              📁 Templates de geração
│   ├── websocket-events.json                   🔌 Eventos WebSocket
│   └── graphql-schema.graphql                  🔮 Schema GraphQL
│
└── 📂 src/ - CÓDIGO FONTE
    └── (código TypeScript)
```

## 🎯 Guia de Navegação por Objetivo

### 🚀 "Quero começar AGORA!"
```
README-SHORT.md (5 min)
    ↓
QUICK_START_FRONTEND.md (10 min)
    ↓
Abrir http://localhost:3000/dashboard
```

### 👤 "Sou usuário, como uso?"
```
USER_GUIDE.md (30 min)
    ↓
FRONTEND_GUIDE.md (20 min)
    ↓
docs/[FEATURE]_GUIDE.md (conforme necessário)
```

### 🎨 "Como uso os frontends?"
```
QUICK_START_FRONTEND.md (10 min)
    ↓
FRONTEND_GUIDE.md (20 min)
    ↓
Abrir interfaces:
  - http://localhost:3000/dashboard
  - http://localhost:3000/graphql
  - docs/websocket-test-client.html
```

### 👨‍💻 "Quero contribuir com código"
```
DEVELOPER_GUIDE.md (45 min)
    ↓
docs/[FEATURE]_IMPLEMENTATION_SUMMARY.md
    ↓
Código fonte em src/
```

### 🐛 "Tenho um problema"
```
docs/TROUBLESHOOTING.md
    ↓
USER_GUIDE.md (seção específica)
    ↓
docs/[FEATURE]_GUIDE.md
```

### 📚 "Quero aprender uma feature específica"
```
USER_GUIDE.md (overview)
    ↓
docs/[FEATURE]_GUIDE.md (detalhes)
    ↓
examples/[feature]-example.* (prática)
```

## 📊 Estatísticas por Diretório

### Raiz (/)
- **Arquivos**: 8 documentos principais
- **Linhas**: ~3,330 linhas
- **Propósito**: Documentação de entrada e guias principais

### docs/
- **Arquivos**: 28 documentos
- **Linhas**: ~9,600 linhas
- **Propósito**: Documentação detalhada e técnica

### examples/
- **Arquivos**: 6+ exemplos
- **Linhas**: ~1,500 linhas
- **Propósito**: Exemplos práticos de uso

### Total
- **Arquivos**: 47+ documentos
- **Linhas**: ~14,430 linhas
- **Cobertura**: 100% das features

## 🎨 Interfaces Web Disponíveis

### 1. Dashboard Web
```
📍 URL: http://localhost:3000/dashboard
📖 Guia: FRONTEND_GUIDE.md#dashboard-web
📋 Detalhes: docs/DASHBOARD_GUIDE.md

Funcionalidades:
  ✅ Métricas em tempo real
  ✅ Histórico de requisições
  ✅ Visualização de configuração
  ✅ Gráficos de analytics
```

### 2. GraphQL Playground
```
📍 URL: http://localhost:3000/graphql
📖 Guia: FRONTEND_GUIDE.md#graphql-playground
📋 Detalhes: docs/GRAPHQL_GUIDE.md

Funcionalidades:
  ✅ Editor de queries interativo
  ✅ Autocomplete
  ✅ Schema explorer
  ✅ Query history
```

### 3. WebSocket Test Client
```
📍 Arquivo: docs/websocket-test-client.html
📖 Guia: FRONTEND_GUIDE.md#websocket-test-client
📋 Detalhes: docs/WEBSOCKET_GUIDE.md

Funcionalidades:
  ✅ Conectar/desconectar WebSocket
  ✅ Subscribe/unsubscribe eventos
  ✅ Enviar mensagens customizadas
  ✅ Ver histórico de mensagens
```

## 📖 Documentos por Público-Alvo

### 🆕 Iniciantes
```
1. README-SHORT.md              (5 min)
2. QUICK_START_FRONTEND.md      (10 min)
3. USER_GUIDE.md                (30 min)
```

### 👤 Usuários Finais
```
1. USER_GUIDE.md                (principal)
2. FRONTEND_GUIDE.md            (interfaces)
3. docs/TROUBLESHOOTING.md      (problemas)
4. docs/[FEATURE]_GUIDE.md      (features específicas)
```

### 🎨 Frontend Developers
```
1. USER_GUIDE.md                (como usar API)
2. FRONTEND_GUIDE.md            (ferramentas)
3. docs/API_REFERENCE.md        (referência)
4. examples/                    (exemplos)
```

### 👨‍💻 Backend Developers
```
1. DEVELOPER_GUIDE.md           (arquitetura)
2. Implementation Summaries     (detalhes técnicos)
3. src/                         (código)
```

### 🧪 QA/Testers
```
1. USER_GUIDE.md                (como usar)
2. FRONTEND_GUIDE.md            (ferramentas de teste)
3. examples/                    (casos de uso)
4. docs/TROUBLESHOOTING.md      (resolver problemas)
```

### 🚀 DevOps
```
1. DEVELOPER_GUIDE.md           (build e deploy)
2. docs/SECURITY_GUIDE.md       (segurança)
3. docs/CONFIG_EXAMPLES.md      (configurações)
```

## 🔍 Busca Rápida por Tópico

### Authentication
```
📄 README.md → Authentication Configuration
📄 USER_GUIDE.md → Authentication Errors
📄 docs/SECURITY_GUIDE.md → Authentication Methods
```

### CORS
```
📄 README.md → CORS Configuration
📄 USER_GUIDE.md → CORS Errors
📄 docs/PROXY_GUIDE.md → CORS Proxy
```

### WebSocket
```
📄 FRONTEND_GUIDE.md → WebSocket Test Client
📄 docs/WEBSOCKET_GUIDE.md → Complete Guide
📄 examples/websocket-client-example.js → Example
```

### GraphQL
```
📄 FRONTEND_GUIDE.md → GraphQL Playground
📄 docs/GRAPHQL_GUIDE.md → Complete Guide
📄 examples/graphql-client-example.js → Example
```

### Dashboard
```
📄 FRONTEND_GUIDE.md → Dashboard Web
📄 docs/DASHBOARD_GUIDE.md → Complete Guide
📄 examples/dashboard-usage.md → Example
```

### Database
```
📄 USER_GUIDE.md → Database Persistence
📄 docs/DATABASE_GUIDE.md → Complete Guide
📄 examples/database-sqlite-example.md → Example
```

### Data Generation
```
📄 USER_GUIDE.md → Dynamic Data Generation
📄 docs/DATA_GENERATION_GUIDE.md → Complete Guide
📄 examples/data-generation-example.md → Example
```

## 🎯 Recomendações Finais

### Para Leitura Sequencial
```
1. README-SHORT.md              ⏱️ 5 min
2. QUICK_START_FRONTEND.md      ⏱️ 10 min
3. USER_GUIDE.md                ⏱️ 30 min
4. FRONTEND_GUIDE.md            ⏱️ 20 min
5. Feature guides               ⏱️ conforme necessário

Total: ~1h + features específicas
```

### Para Consulta Rápida
```
1. DOCUMENTATION_INDEX.md       📇 Índice completo
2. README-SHORT.md              🚀 Referência rápida
3. QUICK_START_FRONTEND.md      ⚡ Frontends rápido
```

### Para Desenvolvimento
```
1. DEVELOPER_GUIDE.md           👨‍💻 Arquitetura
2. Implementation Summaries     📝 Detalhes técnicos
3. src/                         💻 Código fonte
```

---

**Navegue pela documentação**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

**Comece aqui**: [README-SHORT.md](README-SHORT.md)

**Acesse os frontends**: [QUICK_START_FRONTEND.md](QUICK_START_FRONTEND.md)
