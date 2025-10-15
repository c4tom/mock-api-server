# Quick Deploy - Mock API Server

Guia rápido de 5 minutos para deploy.

## ⚙️ Passo 0: Configurar

```bash
# Execute o script de configuração
./configure-deploy.sh

# Isso irá:
# - Pedir seu domínio
# - Configurar porta
# - Gerar JWT secret
# - Atualizar todos os arquivos
```

## 🚀 Deploy Rápido com Docker

### 1. No Servidor

```bash
# Conectar
ssh user@seu-servidor

# Criar diretório
sudo mkdir -p /var/www/mock-api
cd /var/www/mock-api

# Clonar projeto
git clone <seu-repo> .

# Ou enviar arquivos
# scp -r /projetos/app-webs/cors-api-proxy/* user@servidor:/var/www/mock-api/
```

### 2. Configurar

```bash
# Copiar .env
cp .env.production .env

# Editar (IMPORTANTE: mudar JWT_SECRET!)
nano .env
```

Mínimo necessário no `.env`:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
AUTH_ENABLED=true
AUTH_TYPE=jwt
JWT_SECRET=MUDE_ESTE_SECRET_AGORA
CORS_ORIGINS=https://mock-api.my-domain.com
ADMIN_ENABLED=true
```

### 3. Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose -y
```

### 4. Deploy!

```bash
# Build e start
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 5. Configurar Nginx + SSL

```bash
# Instalar Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Copiar configuração (substitua DOMAIN pelo seu domínio)
DOMAIN="mock-api.example.com"
sudo cp nginx.conf /etc/nginx/sites-available/$DOMAIN

# Ativar
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Obter SSL
sudo certbot --nginx -d $DOMAIN

# Reload
sudo systemctl reload nginx
```

### 6. Testar

```bash
# Substitua pelo seu domínio
DOMAIN="mock-api.example.com"
curl https://$DOMAIN/health
```

## ✅ Pronto!

Acesse (substitua pelo seu domínio):
- 🌐 https://mock-api.example.com
- 📊 https://mock-api.example.com/dashboard
- 🔮 https://mock-api.example.com/graphql

---

## 🔄 Atualizar

```bash
cd /var/www/mock-api
./deploy.sh production mock-api.example.com /var/www/mock-api
```

---

## 📚 Guia Completo

Ver [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para mais opções e detalhes.
