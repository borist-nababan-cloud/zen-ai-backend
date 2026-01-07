# Production Deployment Guide for Coolify

## Quick Start

### Environment Variables Required

Add these environment variables in your Coolify application:

```bash
PORT=3000
NODE_ENV=production

# OpenRouter API
OPENROUTER_API_KEY=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

# Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_URL=https://bensupabase.nababancloud.com

# CORS
ALLOWED_ORIGINS=*
SITE_URL=https://zenaibackend.nababancloud.com
```

---

## Step-by-Step Coolify Setup

### 1. Create New Application in Coolify

1. Go to your Coolify dashboard
2. Click "New Resource" → "Application"
3. Choose "Dockerfile" or "Nixpacks" (depending on your setup)

### 2. Configure Environment Variables

In Coolify, go to:
**Application** → **Settings** → **Environment Variables**

Add each variable:

#### Essential Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | `3000` | Yes |
| `NODE_ENV` | `production` | Yes |
| `OPENROUTER_API_KEY` | Your OpenRouter key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Yes |
| `SUPABASE_URL` | `https://bensupabase.nababancloud.com` | Yes |
| `ALLOWED_ORIGINS` | `*` or specific origins | No (defaults to *) |
| `SITE_URL` | `https://zenaibackend.nababancloud.com` | No |

### 3. Deploy the Application

Click "Deploy" in Coolify. The latest code will be pulled from GitHub and deployed.

---

## Testing Your Deployment

After deployment, test these endpoints:

### 1. Health Check
```bash
curl https://zenaibackend.nababancloud.com/health
```

**Expected Response:**
```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1234567890,
  "environment": "production",
  "checks": {
    "supabase": true,
    "openrouter": true
  }
}
```

### 2. Test OpenRouter API Key
```bash
curl https://zenaibackend.nababancloud.com/test-openrouter
```

**Expected Response (Success):**
```json
{
  "status": "success",
  "message": "OpenRouter API key is valid",
  "response": "API key works!",
  "model": "deepseek/deepseek-chat",
  "usage": { ... }
}
```

**If Failed:**
```json
{
  "status": "failed",
  "error": "OpenRouter API key test failed",
  "details": { ... }
}
```

### 3. Test Supabase Connection
```bash
curl https://zenaibackend.nababancloud.com/test-supabase
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Supabase connection successful",
  "data": [ ... ]
}
```

### 4. Test Main AI Endpoint
```bash
curl -X POST https://zenaibackend.nababancloud.com/ask-ai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, can you hear me?",
    "contextData": {},
    "pageName": "test"
  }'
```

**Expected Response:**
```json
{
  "reply": "Yes, I can hear you! How can I help you today?"
}
```

---

## Troubleshooting Common Issues

### Issue 1: "AI service authentication failed"

**Symptoms:**
- 500 error from `/ask-ai`
- Error message: "AI service authentication failed. Check API key."

**Causes:**
1. Invalid OpenRouter API key
2. OpenRouter API key not set in environment variables
3. OpenRouter service down

**Solutions:**

1. **Verify API Key:**
   - Go to https://openrouter.ai/keys
   - Copy your API key
   - Update `OPENROUTER_API_KEY` in Coolify
   - Redeploy

2. **Check API Key Format:**
   - Should start with `sk-or-v1-`
   - No extra spaces or quotes
   - Complete key (not truncated)

3. **Test with `/test-openrouter`:**
   - Visit: `https://zenaibackend.nababancloud.com/test-openrouter`
   - Check response for detailed error

### Issue 2: Supabase Connection Failed

**Symptoms:**
- Database queries fail
- Error: "Invalid API key" or "Database connection failed"

**Solutions:**

1. **Get Correct Supabase Key:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → API
   - Copy **service_role** key (NOT anon key!)

2. **Update Environment Variable:**
   - In Coolify, update `SUPABASE_SERVICE_ROLE_KEY`
   - Redeploy application

3. **Test with `/test-supabase`:**
   - Visit: `https://zenaibackend.nababancloud.com/test-supabase`
   - Check response for detailed error

### Issue 3: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Frontend can't connect to backend

**Solution:**

In Coolify, update `ALLOWED_ORIGINS`:
```bash
# Allow all origins (not recommended for production)
ALLOWED_ORIGINS=*

# OR allow specific origins (recommended)
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### Issue 4: Application Won't Start

**Symptoms:**
- Coolify shows deployment failed
- Container exits immediately

**Solutions:**

1. **Check Logs in Coolify:**
   - Go to Application → Logs
   - Look for error messages
   - Common issues:
     - Missing environment variables
     - Invalid environment variable format
     - Port conflicts

2. **Verify All Required Variables:**
   - `PORT` (must be 3000)
   - `NODE_ENV`
   - `OPENROUTER_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_URL`

---

## Coolify-Specific Tips

### 1. Automatic Deployments

Enable GitHub integration in Coolify:
- Go to Application → Settings → Git
- Connect your GitHub repository
- Enable automatic deployments on push to `main`

### 2. Resource Limits

Configure resource limits in Coolify:
- Go to Application → Settings → Resources
- Set appropriate limits:
  - CPU: 0.5-1 core
  - Memory: 512MB-1GB
  - Disk: 1GB

### 3. Domain Configuration

Set custom domain in Coolify:
- Go to Application → Settings → Domains
- Add your custom domain: `zenaibackend.nababancloud.com`
- Coolify will automatically configure SSL

### 4. Logging

View logs in Coolify:
- Go to Application → Logs
- Real-time logs from your application
- Filter by level: info, warn, error

---

## Environment Variable Best Practices

### ✅ Correct Format:
```bash
VARIABLE_NAME=value_without_spaces
VARIABLE_NAME=value-with-dashes_or_underscores
```

### ❌ Incorrect Format:
```bash
VARIABLE_NAME = value-with-spaces
VARIABLE_NAME="value-with-quotes"
VARIABLE_NAME = 'value-with-single-quotes'
```

### Security Notes:
⚠️ **IMPORTANT:**
- Never commit `.env` file to Git
- Use environment variables in production
- Rotate keys if compromised
- Use different keys for development and production

---

## Performance Optimization

### 1. Enable Caching

Add to your Coolify environment:
```bash
NODE_ENV=production
```

This enables:
- Optimized error handling
- Reduced logging overhead
- Better performance

### 2. Monitor Resource Usage

In Coolify dashboard:
- Check CPU usage
- Check memory usage
- Scale resources if needed

### 3. Database Query Optimization

Current limits:
- Max rows per query: 50
- Timeout: 30 seconds

If queries are slow:
- Add database indexes in Supabase
- Reduce data returned
- Implement caching

---

## Maintenance

### Regular Tasks:

1. **Update Dependencies:**
   ```bash
   npm update
   git commit
   git push
   ```
   Coolify will auto-deploy

2. **Check API Quotas:**
   - OpenRouter: https://openrouter.ai/activity
   - Supabase: https://supabase.com/dashboard → Usage

3. **Monitor Logs:**
   - Check Coolify logs daily
   - Look for errors or warnings
   - Address issues proactively

4. **Backup Environment Variables:**
   - Save your API keys securely
   - Document configuration changes
   - Keep `.env.example` updated

---

## Support

### Getting Help:

1. **Check Coolify Logs:**
   - Application → Logs
   - Look for detailed error messages

2. **Test Endpoints:**
   - `/health` - Service health
   - `/test-openrouter` - API key validation
   - `/test-supabase` - Database connection

3. **Enable Debug Mode:**
   ```bash
   NODE_ENV=development
   ```
   Returns detailed error messages

4. **Check This Guide:**
   - All common issues documented
   - Step-by-step solutions
   - Testing procedures

---

## Deployment Checklist

Before going live:

- [ ] All environment variables set in Coolify
- [ ] OpenRouter API key tested and valid
- [ ] Supabase service role key tested and valid
- [ ] `/health` endpoint returns `{"supabase": true, "openrouter": true}`
- [ ] `/test-openrouter` returns success
- [ ] `/test-supabase` returns success
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] CORS configured correctly
- [ ] Resource limits set appropriately
- [ ] Monitoring/logging enabled

---

**Last Updated:** 2025-01-08
**Status:** Production Ready
**Version:** 1.0.0
