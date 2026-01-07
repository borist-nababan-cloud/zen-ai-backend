# CORS Fix - Quick Deploy Guide

## The Problem
Frontend at `http://localhost:3000` was blocked by CORS policy when accessing `https://zenaibackend.nababancloud.com/ask-ai`

**Error:**
```
Access to fetch at 'https://zenaibackend.nababancloud.com/ask-ai' from origin
'http://localhost:3000' has been blocked by CORS policy: Response to preflight
request doesn't pass access control check: No 'Access-Control-Allow-Origin'
header is present on the requested resource.
```

## The Solution
Fixed in this application (AI backend) - **no frontend changes needed**.

### Changes Made:
1. ✅ Moved CORS middleware **before** Helmet.js
2. ✅ Enhanced CORS configuration with explicit methods/headers
3. ✅ Added OPTIONS preflight handler
4. ✅ Added explicit CORS to `/ask-ai` endpoint

### Deploy Instructions:

## Step 1: Update Environment Variable in Coolify

In your Coolify dashboard:
1. Go to your application
2. Go to **Settings** → **Environment Variables**
3. Update or add `ALLOWED_ORIGINS`:

**For development (allow all):**
```bash
ALLOWED_ORIGINS=*
```

**For production (specific origins):**
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com
```

**IMPORTANT:**
- Your new OpenRouter API key: `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`
- Make sure to update this in Coolify too!

## Step 2: Deploy Latest Code

In Coolify:
1. Click "Deploy" or "Pull & Deploy"
2. Latest commit: `afd904f`
3. Wait for deployment to complete

## Step 3: Test

Test from your frontend:
1. Open your app at `http://localhost:3000`
2. Open the AI chat widget
3. Send a message
4. Should work without CORS errors!

## All Required Environment Variables:

```bash
PORT=3000
NODE_ENV=production

# OpenRouter API
OPENROUTER_API_KEY=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

# Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_URL=https://bensupabase.nababancloud.com

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
SITE_URL=https://zenaibackend.nababancloud.com
```

## Verification:

After deployment, test these URLs:

1. **Health:** `https://zenaibackend.nababancloud.com/health`
   - Should return: `"checks": {"supabase": true, "openrouter": true}`

2. **Test OpenRouter:** `https://zenaibackend.nababancloud.com/test-openrouter`
   - Should return: `"status": "success"` with your new API key

3. **Test from Frontend:**
   - Open your React app
   - Try the AI chat
   - Should work! ✅

## What Was Fixed:

**Before (BROKEN):**
```javascript
// Helmet BEFORE CORS - this was blocking CORS headers
app.use(helmet({...}));
app.use(cors({...}));
```

**After (FIXED):**
```javascript
// CORS FIRST - ensures headers are set correctly
app.use(cors({...}));
app.use(helmet({...}));

// Explicit OPTIONS handler
app.options('/ask-ai', cors(corsOptions));

// Explicit CORS on endpoint
app.post('/ask-ai', cors(corsOptions), async (req, res) => {
  // ...
});
```

## Troubleshooting:

### If CORS still fails after deployment:

1. **Check Coolify logs** for errors
2. **Verify `ALLOWED_ORIGINS`** includes your frontend domain
3. **Check if proxy/reverse proxy** is stripping CORS headers
4. **Try setting `ALLOWED_ORIGINS=*`** for testing

### To see what's happening:

Open browser DevTools → Network tab:
1. Look at the OPTIONS request (preflight)
2. Check response headers for `Access-Control-Allow-Origin`
3. Should show your frontend domain or `*`

## Summary:

✅ **Fixed in:** AI Backend (this application)
✅ **Commit:** `afd904f`
✅ **Where to update:** Coolify environment variables
✅ **No frontend changes needed!**

---

**Last Updated:** 2025-01-08
**Status:** Ready to deploy
