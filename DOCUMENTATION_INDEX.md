# Documentation Index

Índice completo de toda a documentação do Mock API Server.

## 📖 Guias Principais

### Para Começar

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [README-SHORT.md](README-SHORT.md) | Referência rápida | Preciso começar agora! |
| [QUICK_START_FRONTEND.md](QUICK_START_FRONTEND.md) | Acesso rápido aos frontends | Como abro o dashboard? |
| [README.md](README.md) | Documentação completa | Quero ver tudo em detalhes |

### Por Público

| Documento | Público | Conteúdo |
|-----------|---------|----------|
| [USER_GUIDE.md](USER_GUIDE.md) | Usuários finais, Frontend devs, QA | Como usar o servidor |
| [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) | Todos | Dashboard, WebSocket client, GraphQL playground |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Desenvolvedores contribuindo | Arquitetura, como adicionar features |

## 🎨 Frontends e Interfaces

| Interface | URL/Arquivo | Guia |
|-----------|-------------|------|
| Dashboard Web | `http://localhost:3000/dashboard` | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#dashboard-web) |
| GraphQL Playground | `http://localhost:3000/graphql` | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#graphql-playground) |
| WebSocket Test Client | `docs/websocket-test-client.html` | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#websocket-test-client) |

## 📚 Documentação por Feature

### Core Features

| Feature | Guia Principal | Guia Adicional |
|---------|----------------|----------------|
| Mock Data Server | [USER_GUIDE.md](USER_GUIDE.md#1-mock-data-server) | [README.md](README.md#mock-data-server) |
| CORS Proxy | [USER_GUIDE.md](USER_GUIDE.md#2-cors-proxy) | [docs/PROXY_GUIDE.md](docs/PROXY_GUIDE.md) |
| Authentication | [README.md](README.md#authentication) | [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) |
| Rate Limiting | [README.md](README.md#rate-limiting) | [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) |

### Advanced Features

| Feature | Guia Principal | Implementação |
|---------|----------------|---------------|
| Data Generation | [USER_GUIDE.md](USER_GUIDE.md#dynamic-data-generation) | [docs/DATA_GENERATION_GUIDE.md](docs/DATA_GENERATION_GUIDE.md) |
| WebSocket | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#websocket-test-client) | [docs/WEBSOCKET_GUIDE.md](docs/WEBSOCKET_GUIDE.md) |
| GraphQL | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#graphql-playground) | [docs/GRAPHQL_GUIDE.md](docs/GRAPHQL_GUIDE.md) |
| Database Persistence | [USER_GUIDE.md](USER_GUIDE.md#6-database-persistence) | [docs/DATABASE_GUIDE.md](docs/DATABASE_GUIDE.md) |
| API Versioning | [USER_GUIDE.md](USER_GUIDE.md#5-api-versioning) | [docs/VERSIONING_GUIDE.md](docs/VERSIONING_GUIDE.md) |
| Transformations | [README.md](README.md#requestresponse-transformation) | [docs/TRANSFORMATION_GUIDE.md](docs/TRANSFORMATION_GUIDE.md) |
| Response Caching | [README.md](README.md#proxy-configuration) | [docs/CACHE_GUIDE.md](docs/CACHE_GUIDE.md) |
| Dashboard | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#dashboard-web) | [docs/DASHBOARD_GUIDE.md](docs/DASHBOARD_GUIDE.md) |
| Performance Monitoring | [README.md](README.md#admin-endpoints) | [docs/PERFORMANCE_MONITORING_GUIDE.md](docs/PERFORMANCE_MONITORING_GUIDE.md) |
| Recording | [README.md](README.md#admin-endpoints) | [docs/RECORDING_GUIDE.md](docs/RECORDING_GUIDE.md) |

## 🔧 Configuração e Setup

| Tópico | Documento | Seção |
|--------|-----------|-------|
| Variáveis de Ambiente | [README.md](README.md#configuration) | Core Configuration Variables |
| Arquivos .env | [README.md](README.md#environment-files) | Environment Files |
| Exemplos de Configuração | [docs/CONFIG_EXAMPLES.md](docs/CONFIG_EXAMPLES.md) | Todos |
| Setup para AI Studio | [README.md](README.md#ai-studio-setup) | AI Studio Setup |
| Segurança | [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) | Todos |

## 🐛 Troubleshooting

| Problema | Documento | Seção |
|----------|-----------|-------|
| Problemas Gerais | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Todos |
| Autenticação | [USER_GUIDE.md](USER_GUIDE.md#authentication-errors) | Authentication Errors |
| CORS | [USER_GUIDE.md](USER_GUIDE.md#cors-errors) | CORS Errors |
| Proxy | [USER_GUIDE.md](USER_GUIDE.md#proxy-not-working) | Proxy Not Working |
| WebSocket | [USER_GUIDE.md](USER_GUIDE.md#websocket-connection-fails) | WebSocket Connection Fails |
| Frontend | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#troubleshooting) | Troubleshooting |

## 👨‍💻 Para Desenvolvedores

| Tópico | Documento | Seção |
|--------|-----------|-------|
| Arquitetura | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#architecture-overview) | Architecture Overview |
| Estrutura do Projeto | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#project-structure) | Project Structure |
| Componentes Core | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#core-components) | Core Components |
| Setup de Desenvolvimento | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#development-setup) | Development Setup |
| Testes | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#testing) | Testing |
| Adicionar Features | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#adding-features) | Adding Features |
| Build e Deploy | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#build-and-deployment) | Build and Deployment |
| Contribuindo | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#contributing) | Contributing |

## 📋 Referências Técnicas

| Documento | Conteúdo |
|-----------|----------|
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Todos os endpoints REST |
| [docs/PERFORMANCE_MONITORING_QUICK_REFERENCE.md](docs/PERFORMANCE_MONITORING_QUICK_REFERENCE.md) | Referência rápida de métricas |

## 📝 Summaries de Implementação

Documentos técnicos sobre implementações específicas:

| Feature | Summary |
|---------|---------|
| API Versioning | [docs/API_VERSIONING_IMPLEMENTATION_SUMMARY.md](docs/API_VERSIONING_IMPLEMENTATION_SUMMARY.md) |
| Dashboard | [docs/DASHBOARD_IMPLEMENTATION_SUMMARY.md](docs/DASHBOARD_IMPLEMENTATION_SUMMARY.md) |
| Data Generation | [docs/DATA_GENERATION_IMPLEMENTATION_SUMMARY.md](docs/DATA_GENERATION_IMPLEMENTATION_SUMMARY.md) |
| Database | [docs/DATABASE_IMPLEMENTATION_SUMMARY.md](docs/DATABASE_IMPLEMENTATION_SUMMARY.md) |
| GraphQL | [docs/GRAPHQL_IMPLEMENTATION_SUMMARY.md](docs/GRAPHQL_IMPLEMENTATION_SUMMARY.md) |
| Performance Monitoring | [docs/PERFORMANCE_MONITORING_IMPLEMENTATION_SUMMARY.md](docs/PERFORMANCE_MONITORING_IMPLEMENTATION_SUMMARY.md) |
| Transformation | [docs/TRANSFORMATION_IMPLEMENTATION_SUMMARY.md](docs/TRANSFORMATION_IMPLEMENTATION_SUMMARY.md) |
| WebSocket | [docs/WEBSOCKET_IMPLEMENTATION_SUMMARY.md](docs/WEBSOCKET_IMPLEMENTATION_SUMMARY.md) |

## 📂 Exemplos

Exemplos práticos de uso:

| Exemplo | Localização |
|---------|-------------|
| Dashboard Usage | [examples/dashboard-usage.md](examples/dashboard-usage.md) |
| Database SQLite | [examples/database-sqlite-example.md](examples/database-sqlite-example.md) |
| Data Generation | [examples/data-generation-example.md](examples/data-generation-example.md) |
| GraphQL Client | [examples/graphql-client-example.js](examples/graphql-client-example.js) |
| WebSocket Client | [examples/websocket-client-example.js](examples/websocket-client-example.js) |
| Versioning | [examples/versioning-example.md](examples/versioning-example.md) |

## 🎯 Fluxo de Leitura Recomendado

### Para Novos Usuários

1. [README-SHORT.md](README-SHORT.md) - Visão geral rápida
2. [QUICK_START_FRONTEND.md](QUICK_START_FRONTEND.md) - Acesse os frontends
3. [USER_GUIDE.md](USER_GUIDE.md) - Aprenda a usar
4. [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - Explore as interfaces
5. Guias específicos em [docs/](docs/) conforme necessário

### Para Desenvolvedores Frontend

1. [README-SHORT.md](README-SHORT.md) - Setup rápido
2. [USER_GUIDE.md](USER_GUIDE.md) - Como usar a API
3. [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - Dashboard e ferramentas
4. [docs/API_REFERENCE.md](docs/API_REFERENCE.md) - Referência completa

### Para Desenvolvedores Contribuindo

1. [README.md](README.md) - Entenda o projeto completo
2. [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Arquitetura e desenvolvimento
3. [docs/](docs/) - Entenda cada feature em detalhes
4. Implementation Summaries - Veja como foi implementado

### Para QA/Testers

1. [USER_GUIDE.md](USER_GUIDE.md) - Como usar
2. [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - Ferramentas de teste
3. [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Resolver problemas
4. [examples/](examples/) - Casos de uso práticos

## 🔍 Busca Rápida

### Preciso de...

- **Começar agora**: [README-SHORT.md](README-SHORT.md)
- **Abrir o dashboard**: [QUICK_START_FRONTEND.md](QUICK_START_FRONTEND.md)
- **Configurar autenticação**: [README.md](README.md#authentication-configuration)
- **Resolver erro CORS**: [USER_GUIDE.md](USER_GUIDE.md#cors-errors)
- **Gerar dados fake**: [docs/DATA_GENERATION_GUIDE.md](docs/DATA_GENERATION_GUIDE.md)
- **Usar WebSocket**: [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#websocket-test-client)
- **Testar GraphQL**: [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md#graphql-playground)
- **Adicionar feature**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#adding-features)
- **Fazer deploy**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md#build-and-deployment)
- **Ver exemplos**: [examples/](examples/)

## 📊 Estatísticas da Documentação

- **Guias Principais**: 7 documentos
- **Guias de Features**: 15+ documentos em docs/
- **Implementation Summaries**: 8 documentos
- **Exemplos**: 6+ arquivos
- **Total**: 35+ documentos

## 🆘 Precisa de Ajuda?

1. Verifique [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Consulte o guia específico da feature
3. Veja os exemplos em [examples/](examples/)
4. Revise [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) para questões de segurança

## 📝 Contribuindo com a Documentação

Ao adicionar features:

1. Atualize [README.md](README.md) com overview
2. Crie guia detalhado em `docs/FEATURE_GUIDE.md`
3. Adicione exemplos em `examples/`
4. Atualize [USER_GUIDE.md](USER_GUIDE.md) se relevante para usuários
5. Atualize [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) se relevante para devs
6. Adicione entrada neste índice

---

**Última atualização**: 2024-10-14

**Versão da documentação**: 1.0.0
