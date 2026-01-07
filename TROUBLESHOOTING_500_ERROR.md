# Troubleshooting Guide: 500 Internal Server Error

## Issue
Frontend receiving `500 (Internal Server Error)` from `https://zenaibackend.nababancloud.com/ask-ai`

## Critical Finding: Incorrect Supabase Key in .env

### THE PROBLEM:
Your `.env` file has:
```env
OPENROUTER_API_KEY=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
SUPABASE_SERVICE_ROLE_KEY=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
SUPABASE_URL=https://bensupabase.nababancloud.com
```

**Both keys are identical!** This is your OpenRouter API key, NOT your Supabase service role key.

### WHY THIS CAUSES 500 ERROR:
When the backend tries to initialize Supabase with an OpenRouter key:
1. Supabase client initialization fails
2. Any database query throws authentication error
3. Error is caught and returned as 500 Internal Server Error

---

## Solution: Get Your Correct Supabase Service Role Key

### Step 1: Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Select your project

### Step 2: Get API Keys
1. Go to **Settings** → **API**
2. Scroll to **Project API keys**
3. Copy the **service_role** key (NOT the anon key!)

**Important:**
- `service_role` key: Starts with your project ID, looks like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- `anon` key: Public key, less permissions
- You need the **service_role** key for backend operations

### Step 3: Update Your .env File

**For Local Development:**
Edit `.env` in your project:
```env
PORT=3000
NODE_ENV=development

OPENROUTER_API_KEY=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
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_supabase_key_here
SUPABASE_URL=https://bensupabase.nababancloud.com

ALLOWED_ORIGINS=*
SITE_URL=https://your-site.com
```

**For Production (zenaibackend.nababancloud.com):**
You need to set environment variables in your hosting platform:

### If using Railway/Render/Heroku:
1. Go to your deployment dashboard
2. Find "Environment Variables" section
3. Update `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy the application

### If using VPS/Dedicated Server:
1. SSH into your server
2. Edit `.env` file in the application directory
3. Restart the Node.js application

### If using Docker:
1. Edit your Docker environment variables
2. Rebuild and restart the container

---

## Verification Steps

### 1. Check Server Logs

After fixing the key, check your server logs for:

```
✅ Supabase client initialized
```

If you see:
```
❌ Failed to initialize Supabase client: ...
```

Then the key is still incorrect.

### 2. Test the Health Endpoint

Visit: `https://zenaibackend.nababancloud.com/health`

**Expected Response:**
```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1234567890,
  "environment": "production",
  "checks": {
    "supabase": true,  ← Should be true
    "openrouter": true
  }
}
```

If `"supabase": false`, the key is still wrong.

### 3. Test the AI Endpoint

Use curl or Postman to test:
```bash
curl -X POST https://zenaibackend.nababancloud.com/ask-ai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "contextData": {},
    "pageName": "test"
  }'
```

**Expected:** 200 OK with AI response
**If 500:** Check server logs for detailed error

---

## Enhanced Error Logging

I've added comprehensive error logging to help diagnose issues. When you get a 500 error, check the server logs for:

```
========== ERROR DETAILS [abc123] ==========
Error Type: AxiosError
Error Message: Request failed with status code 401
Error Code: ERR_BAD_REQUEST
OpenRouter Status: 401
OpenRouter Data: { error: "Invalid API key" }
Request URL: https://supabase.com/...
========================================
```

This will tell you exactly what's wrong.

---

## Common Causes of 500 Errors

### 1. Invalid Supabase Credentials
**Symptoms:**
- Error: "Invalid API key"
- Supabase queries fail

**Solution:** Check your `.env` file

### 2. Missing Environment Variables
**Symptoms:**
- Error: "Missing required environment variables"
- Server won't start

**Solution:** Set all required variables in `.env`

### 3. OpenRouter API Issues
**Symptoms:**
- Error: "Rate limited by OpenRouter"
- Error: "Request timeout"

**Solution:**
- Check OpenRouter quota
- Verify API key is valid
- Try again later if rate limited

### 4. Database Connection Issues
**Symptoms:**
- Error: "Database connection failed"
- Timeout errors

**Solution:**
- Check Supabase status
- Verify network connectivity
- Check firewall rules

### 5. Request Body Too Large
**Symptoms:**
- Error: "Request entity too large"

**Solution:**
- Current limit: 10MB
- Reduce contextData size
- Or increase limit in server.js

---

## Debugging Checklist

- [ ] Check `.env` file has correct Supabase service role key
- [ ] Verify Supabase URL is correct
- [ ] Confirm OpenRouter API key is valid
- [ ] Check server logs for detailed error messages
- [ ] Test `/health` endpoint
- [ ] Verify Supabase project is active
- [ ] Check OpenRouter quota/billing
- [ ] Ensure all required environment variables are set
- [ ] Restart server after updating `.env`
- [ ] Clear browser cache and test again

---

## Getting Help

### Check Server Logs
Your production server should have logs. Look for:
- Railway: Logs tab in dashboard
- Render: Logs tab in dashboard
- VPS: `journalctl -u your-service-name -f`
- Docker: `docker logs <container-name>`

### Enable Debug Mode
For temporary debugging, you can add to `.env`:
```env
NODE_ENV=development
```

This will return detailed error messages to the frontend.

### Test Locally First
Always test the same `.env` configuration locally:
```bash
npm run dev
```

Then test with curl:
```bash
curl -X POST http://localhost:3000/ask-ai \
  -H "Content-Type: application/json" \
  -d '{"message":"test","contextData":{},"pageName":"test"}'
```

---

## Quick Fix Summary

1. **Get your Supabase service role key** from https://supabase.com/dashboard → Settings → API
2. **Update `.env`** with the correct key
3. **Update production environment variables** on your hosting platform
4. **Restart the application**
5. **Test with frontend**

The 500 error should be resolved once the correct Supabase credentials are configured.

---

## Additional Notes

### Security Warning
⚠️ **NEVER commit your actual `.env` file to Git!**
- It contains sensitive API keys
- It's already in `.gitignore`
- Only commit `.env.example` with placeholder values

### Environment Variable Format
Make sure your `.env` file:
- Has no quotes around values
- Has no spaces around `=` signs
- Uses correct variable names (case-sensitive)

### Correct Format:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Incorrect Format:
```env
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGci..."  # ✗ Has spaces and quotes
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      # ✓ Correct
```

---

**Last Updated:** 2025-01-08
**Status:** Ready for deployment after fixing credentials
