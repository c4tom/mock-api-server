# Deploy Configuration

Este projeto está configurado para deploy parametrizável. Você pode configurar seu próprio domínio e portas sem commitar informações sensíveis.

## 🚀 Quick Start

### 1. Configure seu deployment

```bash
./configure-deploy.sh
```

Este script irá:
- ✅ Pedir seu domínio (ex: `mock-api.example.com`)
- ✅ Configurar porta (padrão: 3000)
- ✅ Gerar JWT secret seguro
- ✅ Atualizar todos os arquivos de configuração
- ✅ Criar `.env.production` personalizado
- ✅ Criar `DEPLOY_INSTRUCTIONS.md` com seus dados

### 2. Revise as configurações

```bash
# Verifique o .env.production gerado
cat .env.production

# Verifique as instruções personalizadas
cat DEPLOY_INSTRUCTIONS.md
```

### 3. Deploy

```bash
# Usando o script de deploy
./deploy.sh production SEU_DOMINIO /var/www/mock-api

# Ou siga as instruções em DEPLOY_INSTRUCTIONS.md
```

## 📁 Arquivos Configuráveis

### Gerados pelo script (não commitados):
- `.deploy-config` - Configurações do deployment
- `.env.production` - Variáveis de ambiente de produção
- `DEPLOY_INSTRUCTIONS.md` - Instruções personalizadas
- `*.bak` - Backups dos arquivos originais

### Templates (commitados):
- `nginx.conf` - Usa `mock-api.my-domain.com` como placeholder
- `docker-compose.yml` - Usa porta 3000 como padrão
- `ecosystem.config.js` - Usa porta 3000 como padrão
- `deploy.sh` - Aceita parâmetros via CLI

## 🔧 Configuração Manual

Se preferir configurar manualmente:

### 1. Edite nginx.conf

```bash
# Substitua mock-api.my-domain.com pelo seu domínio
sed -i 's/mock-api\.domain\.com/seu-dominio.com/g' nginx.conf
```

### 2. Edite docker-compose.yml

```bash
# Ajuste a porta se necessário
sed -i 's/3000:3000/SUA_PORTA:SUA_PORTA/g' docker-compose.yml
```

### 3. Crie .env.production

```bash
cp .env.local .env.production
nano .env.production

# Configure:
# - CORS_ORIGINS=https://seu-dominio.com
# - JWT_SECRET=<gere um secret seguro>
# - PORT=<sua porta>
```

### 4. Gere JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🔒 Segurança

### Arquivos que NÃO devem ser commitados:

- `.deploy-config` - Contém configurações específicas
- `.env.production` - Contém secrets
- `DEPLOY_INSTRUCTIONS.md` - Contém seu domínio
- `*.bak` - Backups temporários

Estes arquivos já estão no `.gitignore`.

### Arquivos seguros para commit:

- `nginx.conf` - Usa placeholders genéricos
- `docker-compose.yml` - Usa valores padrão
- `ecosystem.config.js` - Usa valores padrão
- `deploy.sh` - Aceita parâmetros
- `configure-deploy.sh` - Script de configuração

## 📚 Documentação

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Guia completo de deploy
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Guia rápido
- `DEPLOY_INSTRUCTIONS.md` - Gerado após configuração (personalizado)

## 🎯 Exemplo de Uso

```bash
# 1. Configure
./configure-deploy.sh
# Digite: mock-api.example.com
# Digite: 3000
# Digite: /var/www/mock-api

# 2. Revise
cat .env.production
cat DEPLOY_INSTRUCTIONS.md

# 3. Deploy
./deploy.sh production mock-api.example.com /var/www/mock-api

# 4. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/mock-api.example.com
sudo ln -s /etc/nginx/sites-available/mock-api.example.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d mock-api.example.com
```

## ❓ FAQ

### Como mudar o domínio depois?

```bash
# Execute novamente o script de configuração
./configure-deploy.sh
```

### Como usar porta diferente de 3000?

```bash
# Durante a configuração, especifique a porta
./configure-deploy.sh
# Ou edite manualmente .env.production e docker-compose.yml
```

### Posso ter múltiplos ambientes?

Sim! Use diferentes configurações:

```bash
# Staging
./configure-deploy.sh
# Digite: staging.mock-api.example.com

# Production
./configure-deploy.sh
# Digite: mock-api.example.com
```

### Como fazer backup das configurações?

```bash
# Backup
cp .deploy-config .deploy-config.backup
cp .env.production .env.production.backup

# Restore
cp .deploy-config.backup .deploy-config
cp .env.production.backup .env.production
```

## 🆘 Troubleshooting

### Script de configuração não funciona

```bash
# Verifique permissões
chmod +x configure-deploy.sh

# Execute com bash explicitamente
bash configure-deploy.sh
```

### Arquivos não foram atualizados

```bash
# Verifique se os arquivos existem
ls -la nginx.conf docker-compose.yml ecosystem.config.js

# Execute novamente
./configure-deploy.sh
```

### Quero resetar para valores padrão

```bash
# Restaure do git
git checkout nginx.conf docker-compose.yml ecosystem.config.js

# Ou use os backups .bak
cp nginx.conf.bak nginx.conf
```

---

**Pronto para deploy!** Execute `./configure-deploy.sh` para começar. 🚀
