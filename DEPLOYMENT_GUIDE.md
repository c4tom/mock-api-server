# Deployment Guide - Mock API Server

Guia completo para fazer deploy do Mock API Server em produção.

## 🎯 Objetivo

Deploy em seu domínio personalizado (ex: `https://mock-api.example.com`)

## ⚙️ Configuração Inicial

Antes de fazer deploy, configure seu domínio e portas:

```bash
# Execute o script de configuração
./configure-deploy.sh

# Ou configure manualmente editando:
# - nginx.conf (substitua mock-api.my-domain.com)
# - docker-compose.yml (ajuste portas)
# - .env.production (configure variáveis)
```

## 📋 Pré-requisitos

- Servidor Linux (Ubuntu/Debian recomendado)
- Node.js 18+ instalado
- Nginx instalado
- Domínio configurado (mock-api.my-domain.com)
- SSL/TLS (Let's Encrypt recomendado)

## 🚀 Opções de Deploy

### Opção 1: Deploy Direto (Simples)
### Opção 2: Docker (Recomendado)
### Opção 3: PM2 (Process Manager)

---

## 📦 Opção 1: Deploy Direto

### 1. Preparar o Servidor

```bash
# Conectar ao servidor
ssh user@seu-servidor.com

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve ser 18+
npm --version
```

### 2. Clonar/Enviar o Projeto

```bash
# Criar diretório
sudo mkdir -p /var/www/mock-api
sudo chown $USER:$USER /var/www/mock-api

# Opção A: Git
cd /var/www/mock-api
git clone <seu-repositorio> .

# Opção B: SCP (do seu computador local)
scp -r /projetos/app-webs/cors-api-proxy/* user@servidor:/var/www/mock-api/
```

### 3. Configurar Ambiente de Produção

```bash
cd /var/www/mock-api

# Copiar .env de produção
cp .env.production .env

# Editar configurações
nano .env
```

Configuração `.env` para produção:

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security - IMPORTANTE!
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=MUDE_ESTE_SECRET_PARA_ALGO_SEGURO_E_ALEATORIO
JWT_EXPIRY=24h

# CORS - Especifique seus domínios
CORS_ORIGINS=https://mock-api.my-domain.com,https://my-domain.com
CORS_CREDENTIALS=true

# Rate Limiting - Ativo em produção
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESS=false

# Admin
ADMIN_ENABLED=true
ADMIN_AUTH_REQUIRED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/mock-api/app.log

# Features
PROXY_ENABLED=true
WEBSOCKET_ENABLED=true
GRAPHQL_ENABLED=true
GRAPHQL_PLAYGROUND_ENABLED=true
RECORDING_ENABLED=true
```

### 4. Instalar e Build

```bash
# Instalar dependências
npm ci --only=production

# Build
npm run build

# Testar
PORT=3000 npm start
# Ctrl+C para parar
```

---

## 🐳 Opção 2: Docker (Recomendado)

### 1. Criar Dockerfile

Crie `Dockerfile` na raiz do projeto:

```dockerfile
# Ver arquivo Dockerfile criado
```

### 2. Criar docker-compose.yml

```yaml
# Ver arquivo docker-compose.yml criado
```

### 3. Deploy com Docker

```bash
# No servidor
cd /var/www/mock-api

# Criar .env de produção
cp .env.production .env
nano .env  # Editar conforme necessário

# Build e start
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar status
docker-compose ps

# Parar
docker-compose down

# Rebuild após mudanças
docker-compose up -d --build
```

---

## 🔄 Opção 3: PM2 (Process Manager)

### 1. Instalar PM2

```bash
sudo npm install -g pm2
```

### 2. Criar ecosystem.config.js

Crie na raiz do projeto:

```javascript
// Ver arquivo ecosystem.config.js criado
```

### 3. Deploy com PM2

```bash
cd /var/www/mock-api

# Build
npm run build

# Start com PM2
pm2 start ecosystem.config.js --env production

# Comandos úteis
pm2 status
pm2 logs mock-api-server
pm2 restart mock-api-server
pm2 stop mock-api-server
pm2 delete mock-api-server

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

---

## 🌐 Configurar Nginx

### 1. Instalar Nginx

```bash
sudo apt install nginx -y
```

### 2. Criar configuração do site

```bash
sudo nano /etc/nginx/sites-available/mock-api.my-domain.com
```

Conteúdo:

```nginx
# Ver arquivo nginx.conf criado
```

### 3. Ativar site e configurar SSL

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/mock-api.my-domain.com /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Instalar Certbot (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d mock-api.my-domain.com

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Segurança em Produção

### 1. Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Gerar JWT Secret Seguro

```bash
# Gerar secret aleatório
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Adicionar ao .env
JWT_SECRET=<secret-gerado>
```

### 3. Configurar Logs

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/mock-api
sudo chown $USER:$USER /var/log/mock-api

# Configurar logrotate
sudo nano /etc/logrotate.d/mock-api
```

Conteúdo do logrotate:
```
/var/log/mock-api/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
}
```

---

## 📊 Monitoramento

### Health Check

```bash
# Verificar se está rodando
curl https://mock-api.my-domain.com/health

# Deve retornar:
# {"status":"ok","uptime":123,"timestamp":"..."}
```

### Logs

```bash
# PM2
pm2 logs mock-api-server

# Docker
docker-compose logs -f

# Nginx
sudo tail -f /var/log/nginx/mock-api.access.log
sudo tail -f /var/log/nginx/mock-api.error.log

# Aplicação
tail -f /var/log/mock-api/app.log
```

---

## 🔄 Atualizações

### Deploy de Nova Versão

```bash
cd /var/www/mock-api

# Pull mudanças
git pull

# Instalar dependências
npm ci --only=production

# Build
npm run build

# Restart
# PM2:
pm2 restart mock-api-server

# Docker:
docker-compose up -d --build

# Direto:
sudo systemctl restart mock-api
```

---

## 🧪 Testar Deploy

### 1. Health Check
```bash
curl https://mock-api.my-domain.com/health
```

### 2. Dashboard
```bash
open https://mock-api.my-domain.com/dashboard
```

### 3. GraphQL
```bash
open https://mock-api.my-domain.com/graphql
```

### 4. WebSocket
```javascript
const ws = new WebSocket('wss://mock-api.my-domain.com/ws');
ws.onopen = () => console.log('Connected!');
```

---

## 📋 Checklist de Deploy

- [ ] Servidor configurado com Node.js 18+
- [ ] Projeto clonado/enviado para `/var/www/mock-api`
- [ ] `.env` de produção configurado
- [ ] JWT_SECRET gerado e configurado
- [ ] Dependências instaladas
- [ ] Build executado com sucesso
- [ ] Nginx instalado e configurado
- [ ] SSL/TLS configurado (Let's Encrypt)
- [ ] Firewall configurado
- [ ] Aplicação iniciada (PM2/Docker/Systemd)
- [ ] Health check funcionando
- [ ] Dashboard acessível
- [ ] GraphQL Playground acessível
- [ ] WebSocket funcionando
- [ ] Logs configurados
- [ ] Monitoramento ativo

---

## 🆘 Troubleshooting

### Aplicação não inicia

```bash
# Verificar logs
pm2 logs mock-api-server
# ou
docker-compose logs

# Verificar porta
sudo lsof -i :3000

# Verificar .env
cat .env | grep -v "SECRET\|PASSWORD"
```

### Nginx erro 502

```bash
# Verificar se app está rodando
curl http://localhost:3000/health

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/mock-api.error.log

# Testar configuração
sudo nginx -t
```

### SSL não funciona

```bash
# Renovar certificado
sudo certbot renew

# Verificar certificado
sudo certbot certificates

# Forçar renovação
sudo certbot renew --force-renewal
```

---

## 📚 Próximos Passos

Após deploy:

1. Configure backup automático de `data/`
2. Configure monitoramento (Uptime Robot, etc.)
3. Configure alertas de erro
4. Documente credenciais de acesso
5. Configure CI/CD para deploys automáticos

---

**Deploy completo!** 🎉

Acesse: https://mock-api.my-domain.com
