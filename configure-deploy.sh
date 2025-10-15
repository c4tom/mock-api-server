#!/bin/bash

# Configuration Script for Mock API Server Deployment
# This script helps you configure deployment settings

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Mock API Server - Deployment Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get domain
echo -e "${YELLOW}Enter your domain (e.g., mock-api.example.com):${NC}"
read -p "Domain: " DOMAIN
DOMAIN=${DOMAIN:-"mock-api.my-domain.com"}

# Get port
echo -e "${YELLOW}Enter application port (default: 3000):${NC}"
read -p "Port: " PORT
PORT=${PORT:-3000}

# Get app directory
echo -e "${YELLOW}Enter application directory (default: /var/www/mock-api):${NC}"
read -p "Directory: " APP_DIR
APP_DIR=${APP_DIR:-"/var/www/mock-api"}

# Generate JWT Secret
echo ""
echo -e "${BLUE}Generating secure JWT secret...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Configuration Summary:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Domain:     ${BLUE}$DOMAIN${NC}"
echo -e "Port:       ${BLUE}$PORT${NC}"
echo -e "Directory:  ${BLUE}$APP_DIR${NC}"
echo -e "JWT Secret: ${BLUE}[Generated]${NC}"
echo ""

# Confirm
echo -e "${YELLOW}Proceed with configuration? (y/n)${NC}"
read -p "> " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${RED}Configuration cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Configuring files...${NC}"

# Create deployment config file
cat > .deploy-config << EOF
# Deployment Configuration
# Generated on $(date)
DOMAIN=$DOMAIN
PORT=$PORT
APP_DIR=$APP_DIR
JWT_SECRET=$JWT_SECRET
EOF

echo -e "${GREEN}✅ Created .deploy-config${NC}"

# Update nginx.conf
if [ -f "nginx.conf" ]; then
    sed -i.bak "s/mock-api\.domain\.com/$DOMAIN/g" nginx.conf
    sed -i.bak "s/localhost:3000/localhost:$PORT/g" nginx.conf
    echo -e "${GREEN}✅ Updated nginx.conf${NC}"
fi

# Update docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    sed -i.bak "s/3000:3000/$PORT:$PORT/g" docker-compose.yml
    sed -i.bak "s/PORT=3000/PORT=$PORT/g" docker-compose.yml
    echo -e "${GREEN}✅ Updated docker-compose.yml${NC}"
fi

# Update ecosystem.config.js
if [ -f "ecosystem.config.js" ]; then
    sed -i.bak "s/PORT: 3000/PORT: $PORT/g" ecosystem.config.js
    echo -e "${GREEN}✅ Updated ecosystem.config.js${NC}"
fi

# Create production .env
cat > .env.production << EOF
# Production Environment Configuration
# Domain: $DOMAIN
# Generated on $(date)

# Server Configuration
NODE_ENV=production
PORT=$PORT
HOST=0.0.0.0

# Security Configuration
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=24h

# CORS Configuration
CORS_ORIGINS=https://$DOMAIN
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESS=false

# Mock Data Configuration
MOCK_DATA_PATH=./data/mock
ENABLE_CRUD=true
DEFAULT_DELAY=0

# Proxy Configuration
PROXY_ENABLED=true
PROXY_TIMEOUT=5000
PROXY_RETRIES=2

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/mock-api/app.log

# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_PATH=/ws
WEBSOCKET_MOCK_EVENTS_ENABLED=true
WEBSOCKET_PROXY_ENABLED=true
WEBSOCKET_HEARTBEAT_INTERVAL=30000
WEBSOCKET_MAX_PAYLOAD=10485760

# GraphQL Configuration
GRAPHQL_ENABLED=true
GRAPHQL_PATH=/graphql
GRAPHQL_SCHEMA_PATH=./data/graphql-schema.graphql
GRAPHQL_PLAYGROUND_ENABLED=true
GRAPHQL_INTROSPECTION=true
GRAPHQL_PROXY_ENABLED=false

# Admin Endpoints
ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=true

# Request Recording and Replay
RECORDING_ENABLED=true
RECORDING_AUTO_RECORD=false
RECORDING_MAX_RECORDINGS=1000
RECORDING_STORAGE_TYPE=file
RECORDING_STORAGE_PATH=./data/recordings
EOF

echo -e "${GREEN}✅ Created .env.production${NC}"

# Create deployment instructions
cat > DEPLOY_INSTRUCTIONS.md << EOF
# Deployment Instructions for $DOMAIN

## Configuration

- **Domain**: $DOMAIN
- **Port**: $PORT
- **Directory**: $APP_DIR

## Quick Deploy

\`\`\`bash
# 1. Copy files to server
scp -r * user@server:$APP_DIR/

# 2. On server, run:
cd $APP_DIR
./deploy.sh production $DOMAIN $APP_DIR

# 3. Configure Nginx + SSL
sudo cp nginx.conf /etc/nginx/sites-available/$DOMAIN
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo certbot --nginx -d $DOMAIN
sudo systemctl reload nginx
\`\`\`

## Access

- Main: https://$DOMAIN
- Dashboard: https://$DOMAIN/dashboard
- GraphQL: https://$DOMAIN/graphql
- Health: https://$DOMAIN/health

## JWT Secret

Your JWT secret has been generated and saved in \`.env.production\`.
Keep it secure and never commit it to git!

## Next Steps

1. Review \`.env.production\` and adjust as needed
2. Add \`.deploy-config\` to \`.gitignore\`
3. Deploy using \`./deploy.sh production $DOMAIN $APP_DIR\`
EOF

echo -e "${GREEN}✅ Created DEPLOY_INSTRUCTIONS.md${NC}"

# Update .gitignore
if ! grep -q ".deploy-config" .gitignore 2>/dev/null; then
    echo ".deploy-config" >> .gitignore
    echo -e "${GREEN}✅ Updated .gitignore${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Configuration Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Files configured:${NC}"
echo "  ✓ .deploy-config"
echo "  ✓ .env.production"
echo "  ✓ nginx.conf"
echo "  ✓ docker-compose.yml"
echo "  ✓ ecosystem.config.js"
echo "  ✓ DEPLOY_INSTRUCTIONS.md"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  • Review .env.production before deploying"
echo "  • Never commit .deploy-config or .env.production to git"
echo "  • Keep your JWT secret secure"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review DEPLOY_INSTRUCTIONS.md"
echo "  2. Deploy: ./deploy.sh production $DOMAIN $APP_DIR"
echo ""
