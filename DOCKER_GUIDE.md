# 🚀 Docker Deployment Guide

## Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Important:** Update these values in `.env`:
- MongoDB credentials
- JWT secrets (minimum 32 characters)
- Cloudinary credentials (if using file uploads)
- SMTP credentials (if using email)
- OpenAI API key (if using AI features)
- Payment gateway keys (if using payments)

### 2. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access Applications

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017
- **Redis:** localhost:6379

## Services

### MongoDB
- **Port:** 27017
- **Database:** college-erp
- **Admin User:** admin
- **Admin Pass:** adminpassword (change in `.env`)

### Redis
- **Port:** 6379
- **Purpose:** Caching and session storage

### Backend
- **Port:** 5000
- **Health Check:** http://localhost:5000/api/health
- **API Docs:** http://localhost:5000/api-docs (if configured)

### Frontend
- **Port:** 3000
- **Served by:** nginx (in production image)

## Docker Commands

### Start Services
```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up backend

# Start in background
docker-compose up -d
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend

# Follow logs
docker-compose logs -f backend
```

### Rebuild Services
```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build backend

# Build without cache
docker-compose build --no-cache
```

### Execute Commands in Container
```bash
# Backend shell
docker-compose exec backend sh

# MongoDB shell
docker-compose exec mongodb mongosh

# Redis CLI
docker-compose exec redis redis-cli
```

## Data Persistence

Docker volumes are used to persist data:
- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration
- `redis_data` - Redis cache data

### Backup Database
```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out=/data/backup

# Copy backup to host
docker cp college-erp-mongodb:/data/backup ./mongodb-backup
```

### Restore Database
```bash
# Copy backup to container
docker cp ./mongodb-backup college-erp-mongodb:/data/backup

# Restore
docker-compose exec mongodb mongorestore /data/backup
```

## Production Deployment

### 1. Enable Nginx Reverse Proxy
```bash
# Start with nginx profile
docker-compose --profile production up -d
```

### 2. SSL Configuration

#### Option A: Let's Encrypt (Recommended)
```bash
# Install certbot in nginx container
docker-compose exec nginx apk add certbot certbot-nginx

# Get certificate
docker-compose exec nginx certbot --nginx -d yourdomain.com

# Auto-renewal (add to cron)
0 12 * * * docker-compose exec nginx certbot renew --quiet
```

#### Option B: Custom SSL Certificates
```bash
# Place certificates in nginx/ssl/
mkdir -p nginx/ssl
cp your-cert.crt nginx/ssl/
cp your-key.key nginx/ssl/

# Update nginx configuration
```

### 3. Environment Variables for Production

Update `.env`:
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

### 4. Resource Limits

Add resource limits in `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Monitoring

### Health Checks
```bash
# Check all containers
docker-compose ps

# Check specific service health
docker inspect --format='{{json .State.Health}}' college-erp-backend
```

### Resource Usage
```bash
# All containers
docker stats

# Specific container
docker stats college-erp-backend
```

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. MongoDB not ready - wait for health check
# 2. Missing environment variables - check .env
# 3. Port already in use - change port in docker-compose.yml
```

### Frontend Build Fails
```bash
# Check logs
docker-compose logs frontend

# Common issues:
# 1. Out of memory - increase Docker memory limit
# 2. Missing environment variables - check Dockerfile ARGs
# 3. Node modules issue - clear cache and rebuild
```

### Cannot Connect to Database
```bash
# Check MongoDB health
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check network
docker network inspect college-erp-main_college-erp-network
```

### Slow Performance
```bash
# Check resource usage
docker stats

# Increase resource limits in docker-compose.yml
# Enable Redis caching in backend
# Optimize database indexes
```

## Security Best Practices

1. **Change Default Passwords**
   - MongoDB admin password
   - Application default credentials

2. **Use Strong JWT Secrets**
   - Minimum 32 characters
   - Random, unique values

3. **Enable SSL/TLS**
   - Use HTTPS for production
   - Configure SSL certificates

4. **Restrict Network Access**
   - Don't expose MongoDB/Redis ports publicly
   - Use firewall rules

5. **Regular Updates**
   - Update Docker images
   - Apply security patches

6. **Environment Variables**
   - Never commit `.env` file
   - Use Docker secrets for sensitive data

## Scaling

### Horizontal Scaling
```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3
```

### Load Balancing
Add nginx load balancer configuration or use external load balancer.

## CI/CD Integration

See `.github/workflows/deploy.yml` for automated deployment pipeline.

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review documentation
- Check GitHub issues
- Contact support team

---

**Docker Setup Complete! 🐳**

Ready for Phase 12 production deployment.
