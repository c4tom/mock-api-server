#!/bin/bash

# Deploy Script for Mock API Server
# Usage: ./deploy.sh [environment] [domain] [app_dir]
# Example: ./deploy.sh production mock-api.example.com /var/www/mock-api

set -e

ENV=${1:-production}
DOMAIN=${2:-"mock-api.my-domain.com"}
APP_DIR=${3:-"/var/www/mock-api"}

echo "🚀 Starting deployment to $ENV..."
echo "Domain: $DOMAIN"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running on server
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ Directory $APP_DIR not found!${NC}"
    echo "Run this script on the server or update APP_DIR"
    exit 1
fi

cd $APP_DIR

# Backup current version
echo -e "${BLUE}📦 Creating backup...${NC}"
BACKUP_DIR="$APP_DIR/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r dist $BACKUP_DIR/ 2>/dev/null || true
cp .env $BACKUP_DIR/ 2>/dev/null || true
echo -e "${GREEN}✅ Backup created at $BACKUP_DIR${NC}"
echo ""

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci --only=production
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Build
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    echo "Restoring backup..."
    cp -r $BACKUP_DIR/dist .
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Restart application
echo -e "${BLUE}🔄 Restarting application...${NC}"

# Detect process manager
if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart mock-api-server
    pm2 save
elif command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "Using Docker Compose..."
    docker-compose up -d --build
elif systemctl is-active --quiet mock-api; then
    echo "Using systemd..."
    sudo systemctl restart mock-api
else
    echo -e "${YELLOW}⚠️  No process manager detected${NC}"
    echo "Please restart the application manually"
fi

echo -e "${GREEN}✅ Application restarted${NC}"
echo ""

# Health check
echo -e "${BLUE}🏥 Running health check...${NC}"
sleep 5

HEALTH_URL="https://$DOMAIN/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📍 URLs:${NC}"
    echo "  🌐 Main: https://$DOMAIN"
    echo "  📊 Dashboard: https://$DOMAIN/dashboard"
    echo "  🔮 GraphQL: https://$DOMAIN/graphql"
    echo "  🏥 Health: https://$DOMAIN/health"
    echo ""
else
    echo -e "${RED}❌ Health check failed! (HTTP $RESPONSE)${NC}"
    echo "Check logs for errors"
    exit 1
fi
