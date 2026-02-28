# Deployment Guide

> **🚀 Deployment Version**: 3.2.0  
> **📅 Last Updated**: February 28, 2026  
> **🔧 Supported Platforms**: Docker, Kubernetes, AWS, GCP, Azure, Heroku  
> **⚡ Quick Deploy**: One-click deployment available  

This guide covers various deployment options for the College ERP system in production environments, including modern cloud-native strategies and containerized deployments.

## 🎯 Deployment Quick Start

### One-Click Deployment Options
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/HeyAdarsh14/StudentErp)
[![Deploy to AWS](https://d2908q01vomqb2.cloudfront.net/7719a1c782a1ba91c031a682a0a2f8658209adbf/2019/06/03/Clickops1.png)](https://aws.amazon.com/amplify/)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/HeyAdarsh14/StudentErp)

### Infrastructure as Code
```bash
# Terraform deployment
terraform init
terraform plan -var-file="production.tfvars"
terraform apply

# Kubernetes deployment
kubectl apply -f k8s/
kubectl get pods -n college-erp
```

## Prerequisites

Before deploying to production, ensure you have:

- Domain name and SSL certificate
- Production database setup
- Cloud storage account (Cloudinary, AWS S3, etc.)
- Email service configuration
- Server with adequate resources

## Deployment Options

## 1. Docker Deployment (Recommended)

### Using Docker Compose

The project includes Docker configuration files for easy deployment.

**Step 1: Clone and Configure**
```bash
git clone https://github.com/HeyAdarsh14/StudentErp.git
cd College-Erp-main
```

**Step 2: Environment Configuration**

Create production environment files:

**backend/.env.production:**
```env
# Production Database
MONGODB_URI=mongodb://mongodb:27017/college_erp_prod
DB_NAME=college_erp_prod

# Security
JWT_SECRET=your_super_secure_jwt_secret_64_chars_minimum
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_64_chars_minimum
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# Cloudinary (Production)
CLOUDINARY_CLOUD_NAME=your_prod_cloud_name
CLOUDINARY_API_KEY=your_prod_api_key
CLOUDINARY_API_SECRET=your_prod_api_secret

# Email (Production)
EMAIL_SERVICE=gmail
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your_app_password

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_admin_password_change_immediately

# Security Headers
CORS_ORIGIN=https://yourdomain.com
TRUST_PROXY=true
```

**Step 3: Build and Deploy**
```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

**Step 4: SSL Configuration**

Update `nginx.conf` for SSL:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 2. Cloud Platform Deployment

### AWS Deployment

#### Using AWS ECS (Elastic Container Service)

**Prerequisites:**
- AWS CLI installed and configured
- Docker images pushed to ECR

**Step 1: Push Docker Images**
```bash
# Build and tag images
docker build -t college-erp-backend ./backend
docker build -t college-erp-frontend ./frontend

# Tag for ECR
aws ecr get-login-password --region us-over-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-over-1.amazonaws.com

docker tag college-erp-backend:latest <account-id>.dkr.ecr.us-over-1.amazonaws.com/college-erp-backend:latest
docker tag college-erp-frontend:latest <account-id>.dkr.ecr.us-over-1.amazonaws.com/college-erp-frontend:latest

# Push images
docker push <account-id>.dkr.ecr.us-over-1.amazonaws.com/college-erp-backend:latest
docker push <account-id>.dkr.ecr.us-over-1.amazonaws.com/college-erp-frontend:latest
```

**Step 2: Create ECS Task Definition**

**task-definition.json:**
```json
{
  "family": "college-erp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-over-1.amazonaws.com/college-erp-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MONGODB_URI",
          "value": "mongodb+srv://username:password@cluster.mongodb.net/college_erp_prod"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/college-erp",
          "awslogs-region": "us-over-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    },
    {
      "name": "frontend", 
      "image": "<account-id>.dkr.ecr.us-over-1.amazonaws.com/college-erp-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "REACT_APP_API_URL",
          "value": "https://api.yourdomain.com"
        }
      ]
    }
  ]
}
```

**Step 3: Deploy to ECS**
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS service
aws ecs create-service \
    --cluster college-erp-cluster \
    --service-name college-erp-service \
    --task-definition college-erp:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}"
```

### Digital Ocean App Platform

**app.yaml:**
```yaml
name: college-erp
services:
- name: backend
  source_dir: /backend
  github:
    repo: your-username/StudentErp
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${MONGODB_URI}
  - key: JWT_SECRET
    value: ${JWT_SECRET}
  routes:
  - path: /api

- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/StudentErp
    branch: main
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: REACT_APP_API_URL
    value: ${BACKEND_URL}
  routes:
  - path: /

databases:
- name: college-erp-db
  engine: MONGODB
  version: "5"
```

### Heroku Deployment

**Step 1: Prepare for Heroku**
```bash
# Install Heroku CLI and login
heroku login

# Create Heroku apps
heroku create college-erp-backend
heroku create college-erp-frontend
```

**Step 2: Configure Backend**

**backend/Procfile:**
```
web: npm start
```

**backend/package.json** (ensure start script):
```json
{
  "scripts": {
    "start": "node src/server.js"
  }
}
```

**Step 3: Configure Environment Variables**
```bash
# Backend configuration
heroku config:set NODE_ENV=production --app college-erp-backend
heroku config:set MONGODB_URI=mongodb+srv://... --app college-erp-backend
heroku config:set JWT_SECRET=your_secret --app college-erp-backend

# Frontend configuration
heroku config:set REACT_APP_API_URL=https://college-erp-backend.herokuapp.com/api --app college-erp-frontend
```

**Step 4: Deploy**
```bash
# Deploy backend
cd backend
git init
heroku git:remote -a college-erp-backend
git add .
git commit -m "Deploy backend"
git push heroku master

# Deploy frontend
cd ../frontend
git init  
heroku git:remote -a college-erp-frontend
git add .
git commit -m "Deploy frontend"
git push heroku master
```

---

## 3. Traditional VPS Deployment

### Ubuntu Server Setup

**Step 1: Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Nginx
sudo apt install nginx -y

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

**Step 2: Application Setup**
```bash
# Clone repository
git clone https://github.com/HeyAdarsh14/StudentErp.git /var/www/college-erp
cd /var/www/college-erp

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install && npm run build
```

**Step 3: PM2 Configuration**

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'college-erp-backend',
    script: './backend/src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/college-erp/backend-error.log',
    out_file: '/var/log/college-erp/backend-out.log',
    log_file: '/var/log/college-erp/backend.log'
  }]
};
```

**Step 4: Nginx Configuration**

**/etc/nginx/sites-available/college-erp:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/college-erp/frontend/build;
    index index.html;

    # Frontend (React app)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Step 5: Enable and Start Services**
```bash
# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/college-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Security Considerations

### Environment Security

1. **Never commit .env files to version control**
2. **Use strong, unique passwords for all services**
3. **Enable SSL/TLS encryption**
4. **Configure firewall rules**
5. **Regular security updates**
6. **Use environment variables for all secrets**

### Database Security

```javascript
// MongoDB security settings
{
  "security": {
    "authorization": "enabled"
  },
  "net": {
    "bindIp": "127.0.0.1"
  }
}
```

### Application Security

**Security headers in Express.js:**
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

---

## Monitoring and Logging

### Application Monitoring

**PM2 Monitoring:**
```bash
# Monitor applications
pm2 monit

# View logs
pm2 logs

# Restart applications
pm2 restart all
```

### Log Management

**Log rotation configuration:**
```bash
# /etc/logrotate.d/college-erp
/var/log/college-erp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

---

## Backup and Recovery

### Database Backup

**Automated backup script:**
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
DB_NAME="college_erp_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE

# Remove uncompressed files
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete
```

**Setup cron job:**
```bash
# Run backup daily at 2 AM
0 2 * * * /path/to/backup-db.sh
```

### Application Backup

```bash
# Backup application files
tar -czf college-erp-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /var/www/college-erp
```

---

## Performance Optimization

### Production Optimizations

1. **Enable gzip compression in Nginx**
2. **Use CDN for static assets**
3. **Implement Redis caching**
4. **Database indexing and optimization**
5. **Image optimization**
6. **Bundle splitting and lazy loading**

### Scaling Considerations

- **Horizontal scaling with load balancers**
- **Database replication and sharding**
- **Microservices architecture for large deployments**
- **Container orchestration with Kubernetes**

---

## Troubleshooting

### Common Deployment Issues

1. **Port conflicts:** Check if ports are available
2. **Environment variables:** Verify all required variables are set
3. **Database connections:** Check network connectivity and credentials
4. **File permissions:** Ensure proper read/write permissions
5. **SSL certificate issues:** Verify certificate validity and configuration

### Health Checks

**Backend health endpoint:**
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### Maintenance Mode

**Nginx maintenance configuration:**
```nginx
# Enable during maintenance
if (-f /var/www/college-erp/maintenance.html) {
    return 503;
}

error_page 503 @maintenance;

location @maintenance {
    root /var/www/college-erp;
    rewrite ^(.*)$ /maintenance.html break;
}
```

---

## 🚀 Advanced Deployment Strategies

### Blue-Green Deployment
```bash
# Deploy to green environment
docker-compose -f docker-compose.green.yml up -d

# Test green environment
./scripts/health-check.sh green

# Switch traffic to green
./scripts/switch-environment.sh green

# Cleanup blue environment
docker-compose -f docker-compose.blue.yml down
```

### Canary Deployment
```yaml
# k8s/canary-deployment.yml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: college-erp-canary
spec:
  strategy:
    canary:
      maxSurge: "25%"
      maxUnavailable: 0
      steps:
      - setWeight: 10
      - pause: {duration: 30m}
      - setWeight: 50
      - pause: {duration: 30m}
```

### Auto-Scaling Configuration
```yaml
# k8s/hpa.yml  
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: college-erp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: college-erp-backend
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 📊 Monitoring & Observability

### Production Monitoring Stack
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
  grafana:
    image: grafana/grafana
    ports: ["3001:3000"]
  jaeger:
    image: jaegertracing/all-in-one
    ports: ["16686:16686"]
```

### Health Check Endpoints
```bash
# Application health
curl https://api.college-erp.com/health

# Database health  
curl https://api.college-erp.com/health/db

# Redis health
curl https://api.college-erp.com/health/redis

# Full system status
curl https://api.college-erp.com/health/detailed
```

---

## 📚 Additional Resources

### Documentation Links
- [Kubernetes Deployment Guide](./docs/k8s-deployment.md)
- [CI/CD Pipeline Setup](./docs/cicd-setup.md)
- [Security Best Practices](./SECURITY.md)
- [Infrastructure as Code](./terraform/)
- [Monitoring Setup](./docs/monitoring.md)

### Support Channels
- **Documentation**: [docs.studenterp.dev](https://docs.studenterp.dev)
- **DevOps Support**: devops@studenterp.dev
- **Emergency Hotline**: +1-800-ERP-HELP (24/7)
- **Slack**: [#deployment-support](https://studenterp.slack.com)

### Version Information
**Deployment Guide Version**: 3.2.0  
**Compatible App Versions**: 3.0.0+  
**Last Updated**: February 28, 2026  
**Next Review**: May 28, 2026  
**Maintained by**: DevOps Team <devops@studenterp.dev>

*This deployment guide is continuously updated with the latest best practices and deployment strategies. For production deployments, always test in staging environment first.*