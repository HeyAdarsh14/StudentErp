# 🔐 Environment Variables Documentation

This document provides comprehensive information about all environment variables used in the College ERP system.

## 📋 Quick Setup

Copy the example file and update with your values:
```bash
cp backend/.env.example backend/.env
```

## 🌍 Environment Variables Reference

### Core Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `development` | Application environment (`development`, `production`, `test`) |
| `PORT` | ✅ | `5000` | Server port number |
| `CORS_ORIGIN` | ✅ | `http://localhost:3000` | Allowed CORS origin for frontend |

### 🗄️ Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | `mongodb://localhost:27017/college-erp-v3` | MongoDB connection string |

**Example MongoDB URIs:**
```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/college-erp-v3

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/college-erp-v3

# MongoDB with authentication
MONGODB_URI=mongodb://username:password@localhost:27017/college-erp-v3
```

### 🔑 Authentication Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | - | Secret key for access token signing |
| `JWT_REFRESH_SECRET` | ✅ | - | Secret key for refresh token signing |
| `JWT_EXPIRE` | ✅ | `7d` | Access token expiration time |
| `JWT_REFRESH_EXPIRE` | ✅ | `30d` | Refresh token expiration time |
| `SESSION_SECRET` | ✅ | - | Session encryption secret |

**Security Notes:**
- Use strong, randomly generated secrets (minimum 32 characters)
- Never use default values in production
- Keep secrets confidential and rotate regularly

### 📧 Email Configuration (SMTP)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | ✅ | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | ✅ | `587` | SMTP server port |
| `SMTP_USER` | ✅ | - | SMTP username/email |
| `SMTP_PASS` | ✅ | - | SMTP password/app password |
| `FROM_EMAIL` | ✅ | `noreply@collegeerp.com` | Sender email address |
| `FROM_NAME` | ✅ | `College ERP` | Sender display name |

**Popular SMTP Providers:**
```bash
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Outlook/Hotmail  
SMTP_HOST=smtp.live.com
SMTP_PORT=587

# Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

### ☁️ Cloud Storage (Cloudinary)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUDINARY_CLOUD_NAME` | ✅ | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | - | Cloudinary API secret |

### 💳 Payment Gateway Configuration

#### Razorpay (Primary)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RAZORPAY_KEY_ID` | ✅ | - | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | - | Razorpay secret key |

#### Stripe (Alternative)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | 🔶 | - | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | 🔶 | - | Stripe webhook secret |

### 🤖 AI Services Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | 🔶 | - | OpenAI API key for GPT features |

## 📝 Environment-Specific Configuration

### Development Environment
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college-erp-dev
CORS_ORIGIN=http://localhost:3000
```

### Production Environment
```bash
NODE_ENV=production
PORT=80
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/college-erp-prod
CORS_ORIGIN=https://yourdomain.com
```

### Test Environment
```bash
NODE_ENV=test
PORT=5001
MONGODB_URI=mongodb://localhost:27017/college-erp-test
```

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Always use `.env.example` for documentation
2. **Use strong secrets** - Generate random strings for all secret keys
3. **Rotate secrets regularly** - Change passwords and keys periodically
4. **Environment separation** - Use different credentials for dev/staging/prod
5. **Restrict API keys** - Limit API key permissions to minimum required
6. **Monitor usage** - Track API usage and set up alerts for anomalies

## 🚨 Common Issues & Solutions

### MongoDB Connection Issues
- Ensure MongoDB is running locally or accessible remotely
- Check firewall settings for remote connections
- Verify username/password for authenticated connections

### Email Not Sending
- Enable 2FA and use app passwords for Gmail
- Check SMTP settings and port accessibility
- Verify sender email is authorized

### Payment Gateway Issues
- Ensure webhook URLs are correctly configured
- Check API key permissions and restrictions
- Verify test/live mode settings

## 📞 Support

For environment configuration issues:
- Check the logs in `backend/logs/` directory
- Use the health check endpoint: `GET /health`
- Run environment validation: `npm run env:validate`

---

*Last updated: February 26, 2026*