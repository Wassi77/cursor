# Deployment Guide

Guide for deploying Movie Mimic to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Domain name
- Server with at least:
  - 2 CPU cores
  - 4GB RAM
  - 50GB disk space (for videos and exports)
- FFmpeg installed
- SSL certificate (for HTTPS)

## Deployment Options

### Option 1: Docker (Recommended)

Easiest deployment method with containerization.

### Option 2: Manual Deployment

Deploy services manually on server.

### Option 3: Cloud Services

Deploy to cloud providers (AWS, GCP, Azure).

## Docker Deployment

### 1. Prepare Server

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
git clone <repository-url>
cd movie-mimic
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update production settings:
```bash
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

### 4. Build and Deploy

```bash
# Build production images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 5. Setup Reverse Proxy (Nginx)

Install Nginx:
```bash
sudo apt-get install nginx -y
```

Configure `/etc/nginx/sites-available/movie-mimic`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/movie-mimic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### 7. Docker Management Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update application
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Backup data
docker exec backend cat data/movie-mimic.sqlite > backup_$(date +%Y%m%d).sqlite

# Stop services
docker-compose down
```

## Manual Deployment

### 1. Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt-get install ffmpeg -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Clone and Setup

```bash
git clone <repository-url>
cd movie-mimic

# Install dependencies
npm install --production
cd frontend && npm install --production
cd ..

# Build shared package
cd shared && npm run build && cd ..

# Build backend
cd backend && npm run build && cd ..

# Build frontend
cd frontend && npm run build && cd ..
```

### 3. Configure Environment

```bash
nano .env
```

Set production values.

### 4. Start Services with PM2

Backend ecosystem file `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'movie-mimic-backend',
      cwd: '/path/to/movie-mimic/backend',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

Start backend:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Serve frontend with Nginx (point to `frontend/dist`).

### 5. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/movie-mimic/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Cloud Deployment

### AWS Deployment

#### Option 1: ECS (Elastic Container Service)

1. Push Docker images to ECR
2. Create ECS task definitions
3. Configure load balancer
4. Setup auto-scaling

#### Option 2: EC2 + Docker

1. Launch EC2 instance
2. Follow Docker deployment steps
3. Configure Security Groups

#### Option 3: Elastic Beanstalk

1. Create Docker platform environment
2. Deploy with `eb deploy`

### Google Cloud Platform

#### Option 1: Cloud Run

1. Build and push to Container Registry
2. Deploy with `gcloud run deploy`
3. Configure load balancer

#### Option 2: Compute Engine

1. Create VM instance
2. Follow Docker deployment steps
3. Configure Cloud Load Balancing

### Azure

#### Option 1: Container Instances

1. Push to Azure Container Registry
2. Deploy container group
3. Configure Application Gateway

#### Option 2: Virtual Machines

1. Create VM
2. Follow manual deployment steps
3. Configure Azure Front Door

## Environment Configuration

### Production Variables

```bash
NODE_ENV=production
PORT=5000

# Database
DB_PATH=/var/lib/movie-mimic/movie-mimic.sqlite

# File Upload
MAX_UPLOAD_SIZE=2147483648
ALLOWED_VIDEO_FORMATS=mp4,webm,mkv,avi,mov
ALLOWED_SUBTITLE_FORMATS=srt,vtt,ass

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/movie-mimic/app.log
```

### Security Notes

- Never commit `.env` to git
- Use strong random values for secrets
- Restrict file permissions on `.env`: `chmod 600 .env`
- Use environment-specific configurations

## SSL/HTTPS Setup

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot -y

# Get certificate (standalone mode)
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

Configure paths in Nginx:
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### Cloud-Provided SSL

AWS: AWS Certificate Manager (ACM)
GCP: Cloud Certificate Manager
Azure: Key Vault + Application Gateway

## Monitoring & Maintenance

### Health Checks

```bash
# Check API health
curl https://yourdomain.com/api/health

# Check PM2 processes
pm2 status

# Check Docker containers
docker-compose ps
```

### Log Management

```bash
# View backend logs
tail -f /var/log/movie-mimic/app.log

# PM2 logs
pm2 logs

# Docker logs
docker-compose logs -f backend
```

### Backups

#### Database Backup

```bash
# Manual backup
cp /var/lib/movie-mimic/movie-mimic.sqlite backup_$(date +%Y%m%d).sqlite

# Automate with cron
0 2 * * * cp /var/lib/movie-mimic/movie-mimic.sqlite /backup/movie-mimic_$(date +\%Y\%m\%d).sqlite
```

#### Files Backup

```bash
# Backup uploads directory
rsync -av /var/lib/movie-mimic/uploads/ /backup/uploads_$(date +%Y%m%d)/

# Or use AWS S3 sync
aws s3 sync /var/lib/movie-mimic/uploads s3://your-bucket/backups/
```

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart (Docker)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Or with PM2
cd backend && npm run build
pm2 restart movie-mimic-backend
```

### Scaling

#### Horizontal Scaling

- Add more backend instances behind load balancer
- Use shared storage (NFS, S3)
- Implement distributed session storage

#### Vertical Scaling

- Increase CPU/RAM
- Optimize database queries
- Add caching layer

## Performance Tuning

### Nginx Optimization

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 2048;

gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

client_max_body_size 2G;
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
```

### Database Optimization

- Run VACUUM periodically: `sqlite3 data.db "VACUUM;"`
- Create appropriate indexes (already in schema)
- Consider WAL mode (enabled by default)

### Application Optimization

- Enable production mode
- Use CDN for static assets
- Implement caching headers
- Consider Redis for caching

## Troubleshooting

### Application Won't Start

1. Check logs: `docker-compose logs` or `pm2 logs`
2. Verify port availability: `netstat -tlnp | grep :5000`
3. Check environment variables
4. Verify dependencies are installed

### File Upload Fails

1. Check disk space: `df -h`
2. Verify uploads directory permissions
3. Check file size limit in Nginx: `client_max_body_size`
4. Verify FFmpeg is working

### High Memory Usage

1. Monitor with: `htop` or `docker stats`
2. Limit container resources in docker-compose.yml
3. Check for memory leaks
4. Restart services periodically

### Database Locked

1. Stop application
2. Remove lock files: `rm -f data/*.wal data/*.shm`
3. Restart application

### SSL Certificate Issues

1. Check certificate expiry: `certbot certificates`
2. Renew manually: `certbot renew`
3. Verify Nginx configuration: `nginx -t`
4. Check firewall allows port 443

## Security Checklist

- [ ] HTTPS enabled with valid SSL
- [ ] CORS configured to trusted origins only
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)
- [ ] Environment variables not committed
- [ ] File upload restrictions in place
- [ ] Input validation on all endpoints
- [ ] Regular security updates applied
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring and alerting setup
- [ ] Log rotation configured

## Cost Estimation

### Minimum VPS

- 2 CPU cores
- 4GB RAM
- 50GB SSD
- Cost: ~$20-40/month

### Recommended VPS

- 4 CPU cores
- 8GB RAM
- 200GB SSD
- Cost: ~$50-80/month

### Cloud Services

- AWS EC2 (t3.medium): ~$30/month
- GCP Compute Engine (e2-medium): ~$40/month
- Azure Standard B2s: ~$50/month

Additional costs:
- Storage (S3, etc.): $0.023/GB
- Bandwidth: Varies by provider
- SSL certificates: Free (Let's Encrypt) or paid

## Support

For deployment issues:

1. Check [troubleshooting section](#troubleshooting)
2. Review [SETUP.md](./SETUP.md)
3. Check application logs
4. Open issue on GitHub with:
   - Deployment method
   - Server specifications
   - Error messages
   - Configuration (redacted)

---

**Good luck with your deployment!** 🚀
