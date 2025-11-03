# 💻 Local Development Setup

This guide explains how to set up environment variables for **local development**.

## ⚠️ Important Note

**Client-side JavaScript CANNOT directly read `.env` files** - this is a browser security restriction. 

To use your `.env` file, you **must** use Vercel CLI which runs serverless functions that CAN read `process.env`.

---

## ✅ Recommended: Use Vercel CLI (Uses Your `.env` File)

This is the **only way** to use your `.env` file with this setup:

1. **Install Vercel CLI** (one-time):
   ```bash
   npm i -g vercel
   ```

2. **Create `.env` file** in project root (you already have this!):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/vehicle-qa-trigger
   ```

3. **Run Vercel dev server**:
   ```bash
   vercel dev
   ```

4. **Open** `http://localhost:3000` (Vercel's default port)

**How it works:**
- `vercel dev` runs local serverless functions
- `/api/config.js` reads from `process.env` (which reads your `.env` file)
- Frontend fetches from `/api/config` and gets your `.env` values!

**Pros:** 
- ✅ Uses your `.env` file (no hardcoding)
- ✅ Matches production exactly
- ✅ Easy to update (just edit `.env`)

**Cons:**
- ⚠️ Requires Node.js and Vercel CLI
- ⚠️ Different port (3000 vs 5500)

---

## Option 2: Update Defaults in `js/config.js` (If You Can't Use Vercel CLI)

**Best for:** Quick testing when Vercel CLI isn't available

**Note:** This doesn't use your `.env` file - values are hardcoded in `config.js`.

1. Open `js/config.js`
2. Find the default values (currently set to `null`):
   ```javascript
   this.SUPABASE_URL = null;
   this.SUPABASE_ANON_KEY = null;
   this.N8N_WEBHOOK_URL = null;
   ```
   **Note:** In the current setup, all values come from `/api/config`. This method is only if you can't use Vercel CLI and need temporary hardcoded values for testing.

3. Temporarily add your values (for testing only):
   ```javascript
   this.SUPABASE_URL = 'https://your-project.supabase.co';
   this.SUPABASE_ANON_KEY = 'your-anon-key';
   this.N8N_WEBHOOK_URL = 'http://localhost:5678/webhook-test/vehicle-qa-trigger';
   ```
4. Save and refresh your browser

**⚠️ Security Warning:** This exposes keys in your code. Only use for local testing. Remove before committing to Git!

**Pros:** 
- ✅ Works with any static server (Python, VS Code Live Server, etc.)
- ✅ No additional tools needed

**Cons:**
- ⚠️ Doesn't use your `.env` file
- ⚠️ Values are hardcoded in code

---

## Quick Start (Using Your `.env` File)

**Use Vercel CLI to read your `.env` file:**
1. Make sure you have `.env` file in project root (you do!)
2. Run: `vercel dev`
3. Open: `http://localhost:3000`
4. Done! Your `.env` values are now being used! 🎉

---

## Which Should I Use?

| Use Case | Recommended Method |
|----------|-------------------|
| **Using `.env` file** | **✅ Option 1** (Vercel CLI) |
| Production testing | **✅ Option 1** (Vercel CLI) |
| API route debugging | **✅ Option 1** (Vercel CLI) |
| Can't install Vercel CLI | **Option 2** (update defaults) |

---

## Troubleshooting

**"API not available" message in console:**
- This is **normal** if using Option 1 (static server)
- App will use default values from `config.js`
- You can ignore this message

**Config not updating:**
- Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)
- Check browser console for errors
- Verify values in `js/config.js` are correct

**Vercel CLI not working:**
- Make sure Node.js is installed: `node --version`
- Try: `npm install -g vercel` again
- Check `.env` file exists in project root

---

**For production setup, see `SETUP_PRODUCTION.md`**

