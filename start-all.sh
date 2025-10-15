#!/bin/bash

# Script para iniciar o servidor e abrir todos os frontends
# Mock API Server - Start All

echo "🚀 Mock API Server - Iniciando tudo..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo "Copiando .env.local para .env..."
    cp .env.local .env
    echo -e "${GREEN}✅ Arquivo .env criado${NC}"
    echo ""
fi

# Verificar se node_modules existe
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚠️  Dependências não instaladas!${NC}"
    echo "Instalando dependências..."
    npm install
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
    echo ""
fi

# Função para abrir URL no navegador
open_browser() {
    local url=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$url"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "$url" 2>/dev/null || echo "Abra manualmente: $url"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        start "$url"
    else
        echo "Abra manualmente: $url"
    fi
}

# Iniciar o servidor em background
echo -e "${BLUE}🔧 Iniciando servidor...${NC}"
npm run dev &
SERVER_PID=$!

# Aguardar o servidor iniciar (10 segundos)
echo "Aguardando servidor iniciar..."
sleep 10

# Verificar se o servidor está rodando
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ Servidor iniciado com sucesso!${NC}"
    echo ""
    
    # Abrir frontends
    echo -e "${BLUE}🎨 Abrindo interfaces web...${NC}"
    echo ""
    
    echo "📊 Dashboard: http://localhost:3000/dashboard"
    open_browser "http://localhost:3000/dashboard"
    sleep 2
    
    echo "🔮 GraphQL Playground: http://localhost:3000/graphql"
    open_browser "http://localhost:3000/graphql"
    sleep 2
    
    echo "🔌 WebSocket Test Client: docs/websocket-test-client.html"
    open_browser "docs/websocket-test-client.html"
    
    echo ""
    echo -e "${GREEN}✅ Tudo pronto!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}📍 URLs Disponíveis:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🌐 Servidor:          http://localhost:3000"
    echo "  📊 Dashboard:         http://localhost:3000/dashboard"
    echo "  🔮 GraphQL:           http://localhost:3000/graphql"
    echo "  🔌 WebSocket Client:  docs/websocket-test-client.html"
    echo "  🏥 Health Check:      http://localhost:3000/admin/health"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${YELLOW}💡 Dica: Pressione Ctrl+C para parar o servidor${NC}"
    echo ""
    
    # Manter o script rodando e mostrar logs
    wait $SERVER_PID
else
    echo -e "${RED}❌ Erro ao iniciar o servidor!${NC}"
    echo "Verifique os logs acima para mais detalhes."
    exit 1
fi
