# 🚀 Production Setup Guide

This guide explains how to configure environment variables for production deployment on Vercel.

## ✅ Correct Approach

### Local Development (`/.env` file)
- Create `.env` file in project root
- Add your local values (e.g., `localhost` for n8n)
- **Never commit** `.env` to git (it's in `.gitignore`)

### Production (Vercel Environment Variables)
- Add variables in **Vercel Dashboard**
- Variables are **injected** via `/api/config` endpoint
- **Secure** - never exposed in source code

---

## 📋 Step-by-Step Vercel Setup

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login (first time only)
vercel login

# Deploy
vercel

# Or connect GitHub repo for automatic deployments
```

### 2. Add Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add each variable:

   | Variable Name | Example Value | Description |
   |--------------|---------------|--------------|
   | `SUPABASE_URL` | `https://abc123.supabase.co` | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Your Supabase anonymous key |
   | `N8N_WEBHOOK_URL` | `https://n8n.example.com/webhook/...` | Your n8n webhook URL |

5. Select environments:
   - ✅ **Production**
   - ✅ **Preview** (for PR deployments)
   - ✅ **Development** (optional)

6. Click **Save**

### 3. Redeploy

After adding variables, **redeploy** your application:

```bash
# Via CLI
vercel --prod

# Or via Dashboard:
# Click "Deployments" → Find latest → "Redeploy"
```

**Why redeploy?** Environment variables are only injected during build/deploy.

---

## 🔧 How It Works

### Configuration Flow

```
┌─────────────────────────────────────┐
│      Local Development               │
│                                      │
│  Option 1: Direct Values            │
│  ┌──────────┐                       │
│  │ config.js│──► Uses hardcoded    │
│  │ defaults │   values              │
│  └──────────┘                       │
│                                      │
│  Option 2: Vercel CLI               │
│  ┌──────────┐                       │
│  │ .env     │──► vercel dev        │
│  │ file     │   └──► /api/config   │
│  └──────────┘       └──► config.js│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Production (Vercel)             │
│  ┌──────────────┐                   │
│  │ Vercel       │──► /api/config   │
│  │ Env Vars     │   (serverless)   │
│  └──────────────┘                   │
│         │                           │
│         └──► Fetch from API        │
│              └──► config.js         │
│                   └──► App uses     │
└─────────────────────────────────────┘
```

### Files Involved

1. **`.env`** (local only, gitignored)
   - Used by `vercel dev` for local serverless functions
   - OR just for reference (update `config.js` defaults)

2. **`/api/config.js`** (Vercel serverless function)
   - Reads `process.env.*` from Vercel (production) or `.env` (local with `vercel dev`)
   - Returns JSON with configuration

3. **`js/config.js`** (client-side)
   - Tries to fetch from `/api/config` first
   - Falls back to hardcoded defaults if API unavailable
   - Provides `window.config` to rest of app

---

## 🔒 Security Notes

### ✅ Safe to Expose
- **`SUPABASE_ANON_KEY`** - This is meant to be public (it's the "anonymous" key with RLS policies)
- **`SUPABASE_URL`** - Public URL, safe to expose

### ⚠️ Keep Private
- **`SUPABASE_SERVICE_ROLE_KEY`** - Never expose (if you add it later)
- **API secrets** - Keep server-side only

### Best Practice
- ✅ Use `.env` for local development
- ✅ Use Vercel env vars for production
- ✅ Never hardcode secrets in code
- ✅ Never commit `.env` to git

---

## 🧪 Testing Production Config

### Verify Environment Variables are Loaded

1. Deploy to Vercel
2. Open browser console on your deployed site
3. Run:
   ```javascript
   console.log(window.config.getAll());
   ```
4. Should show your production values

### Debug Checklist

- [ ] Variables added in Vercel dashboard
- [ ] Variables selected for correct environments
- [ ] Application redeployed after adding variables
- [ ] `/api/config` endpoint returns data (check Network tab)
- [ ] `window.config` is populated (check console)

---

## 📝 Quick Reference

### Local Development
```bash
# Create .env file
cp .env.example .env

# Edit .env with your local values
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/vehicle-qa-trigger
```

### Production
- Add same variables in Vercel dashboard
- Use production URLs (not `localhost`)
- Redeploy after adding variables

---

**That's it!** Your app will automatically use the right configuration for each environment. 🎉

