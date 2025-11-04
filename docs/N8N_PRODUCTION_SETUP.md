# 🔗 n8n Production Setup Guide

This guide explains how to connect your **Vercel-deployed app** (`https://fleetfox-ai-qa.vercel.app/`) to n8n.

## 🎯 The Problem

- Your app is deployed on Vercel: `https://fleetfox-ai-qa.vercel.app/`
- Your n8n is running locally: `http://localhost:5678`
- **Vercel CANNOT reach localhost** - it needs a publicly accessible n8n URL

## ✅ Solution Options

### Option 1: n8n Cloud (Easiest - Recommended) ⭐

1. **Sign up for n8n Cloud:**
   - Go to https://n8n.io/cloud
   - Free tier available (suitable for demos/testing)

2. **Import your workflow:**
   - Export your workflow from local n8n
   - Import into n8n Cloud
   - Activate the workflow

3. **Get your production webhook URL:**
   - In n8n Cloud, open your workflow
   - Click the Webhook node
   - Copy the "Production URL" (looks like: `https://your-name.app.n8n.cloud/webhook/vehicle-qa-trigger`)

4. **Configure CORS in n8n Cloud:**
   - Settings → CORS
   - Add: `https://fleetfox-ai-qa.vercel.app`
   - Save

5. **Set Vercel environment variable:**
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add/Update `N8N_WEBHOOK_URL`
   - Value: `https://your-name.app.n8n.cloud/webhook/vehicle-qa-trigger`
   - Environment: **Production**
   - Save

6. **Redeploy Vercel:**
   - Deployments → Redeploy (or push to git)

---

### Option 2: ngrok Tunnel (For Local Testing)

**Use this ONLY for development/testing, NOT production!**

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or using package manager
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 5678
   ```

3. **Get your ngrok URL:**
   - ngrok will show: `https://abc123.ngrok.io`
   - Use: `https://abc123.ngrok.io/webhook/vehicle-qa-trigger`

4. **Configure n8n CORS:**
   - In n8n settings (or environment variable):
   - Set `N8N_CORS_ORIGIN` to: `https://fleetfox-ai-qa.vercel.app`

5. **Set Vercel environment variable:**
   - `N8N_WEBHOOK_URL` = `https://abc123.ngrok.io/webhook/vehicle-qa-trigger`
   - **Note:** ngrok free tier gives you a new URL each time - use paid tier for stable URL

---

### Option 3: Self-Hosted n8n on a Server

1. **Deploy n8n on a VPS/Server** with public IP
2. **Set up domain** (e.g., `n8n.yourcompany.com`)
3. **Configure CORS** in n8n to allow `https://fleetfox-ai-qa.vercel.app`
4. **Set Vercel env var** to your public n8n webhook URL

---

## 🔍 Verification Steps

### Check 1: Vercel Environment Variable
- ✅ Vercel Dashboard → Settings → Environment Variables
- ✅ `N8N_WEBHOOK_URL` exists
- ✅ Value is **NOT** `localhost`
- ✅ Value starts with `https://`

### Check 2: n8n CORS Configuration
- ✅ n8n allows requests from `https://fleetfox-ai-qa.vercel.app`
- ✅ CORS origin includes your Vercel domain

### Check 3: Test the Connection

1. **Open browser console** on your Vercel site (F12)
2. **Look for:**
   - `📥 Config API response:` - shows what URL is loaded
   - `🔍 Config state:` - shows final webhook URL being used
3. **Try submitting photos:**
   - Should reach n8n successfully
   - No "Failed to fetch" errors

---

## 📝 Quick Checklist

- [ ] n8n is publicly accessible (not localhost)
- [ ] n8n CORS allows `https://fleetfox-ai-qa.vercel.app`
- [ ] Vercel env var `N8N_WEBHOOK_URL` is set correctly
- [ ] Vercel env var is set for **Production** environment
- [ ] Vercel has been **redeployed** after setting env var
- [ ] Browser cache cleared (hard refresh: Ctrl+Shift+R)

---

## 🐛 Troubleshooting

### Error: "Webhook URL points to localhost"
- **Cause:** `N8N_WEBHOOK_URL` in Vercel still points to localhost
- **Fix:** Update to public n8n URL and redeploy

### Error: "Failed to fetch" / "Network error"
- **Cause:** n8n CORS not configured OR n8n not accessible
- **Fix:** 
  1. Check n8n CORS settings
  2. Test n8n URL directly in browser
  3. Verify n8n is running and accessible

### Error: "CORS error"
- **Cause:** n8n doesn't allow requests from your Vercel domain
- **Fix:** Add `https://fleetfox-ai-qa.vercel.app` to n8n CORS settings

---

## 💡 Recommended: Use n8n Cloud

For production, **n8n Cloud is the easiest solution**:
- ✅ No server setup required
- ✅ Stable URLs (no tunnel issues)
- ✅ Easy CORS configuration
- ✅ Free tier available
- ✅ Production-ready

Visit: https://n8n.io/cloud

