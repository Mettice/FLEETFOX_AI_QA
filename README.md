# 🦊 FleetFox - AI-Powered Vehicle Quality Assurance Platform

A complete, production-ready solution for automated vehicle cleaning quality checks using AI vision models, real-time feedback, and intelligent workflow automation.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
[![Live Demo](https://img.shields.io/badge/live%20demo-vercel.app-000000?logo=vercel)](https://fleetfox-ai-qa.vercel.app/)

**🌐 Live Application:** [https://fleetfox-ai-qa.vercel.app/](https://fleetfox-ai-qa.vercel.app/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Workflow Details](#workflow-details)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

FleetFox automates the quality assurance process for vehicle cleaning services. Field workers ("Foxes") submit photos of cleaned vehicles, and the system:

- ✅ **Analyzes 7 photos per vehicle** (4 exterior + 3 interior) using AI vision
- ✅ **Detects dirt, damage, and quality issues** in real-time
- ✅ **Applies client-specific SLA rules** (not all dirt is dirt!)
- ✅ **Generates actionable feedback** within 1-3 minutes
- ✅ **Sends instant notifications** to workers and clients
- ✅ **Distinguishes damage from dirt** (pre-existing vs. cleaning quality)
- ✅ **Validates image types** (ensures correct photos are uploaded)
- ✅ **Handles poor image quality** (dark, blurry images from night operations)

---

## ✨ Features

### Core Functionality
- 🔐 **Role-based Authentication** (Fox, Client, Admin)
- 📸 **Photo Upload** with progress tracking and validation
- 🤖 **AI-Powered Analysis** using Claude Sonnet 4 (vision model)
- 📊 **Real-time Notifications** via Supabase Realtime
- 📈 **Dashboard Views** tailored by user role
- 🎯 **Client-Specific SLA Rules** (customizable quality standards)
- 📧 **Email Notifications** (optional Gmail integration)
- 🔄 **Complete Audit Trail** (all checks stored with timestamps)

### User Experience
- 🎨 **Modern, Responsive UI** with dark theme
- ⚡ **Fast Performance** (vanilla JS, no heavy frameworks)
- 📱 **Mobile-Friendly** design
- 🔔 **Browser Notifications** (with permission)
- ✅ **Onboarding Flow** for new users
- 🔍 **Image Type Validation** (AI verifies photo matches declared type)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│  (index.html)   │
│   Vanilla JS    │
└────────┬────────┘
         │
         ├──► Supabase (Auth + Storage)
         │
         ├──► n8n Webhook
         │    │
         │    └──► Claude AI (Vision)
         │         │
         │         └──► SLA Rules Applied
         │              │
         │              └──► Feedback Generated
         │                   │
         │                   └──► Save to Supabase DB
         │                        │
         │                        └──► Realtime Trigger
         │                             │
         └─────────────────────────────┘
                 Frontend Updates
```

### Data Flow

1. **User submits** → Frontend uploads images to Supabase Storage
2. **Payload sent** → n8n webhook receives task data
3. **AI Analysis** → Claude Sonnet analyzes all 7 images
4. **SLA Applied** → Business rules filter detections
5. **Feedback Generated** → Claude Haiku creates actionable text
6. **Results Saved** → Quality check stored in Supabase
7. **Realtime Push** → Frontend receives instant notification
8. **UI Updates** → User sees results immediately

---

## 🛠️ Tech Stack

### Frontend
- **Vanilla JavaScript** (no frameworks - easy deployment)
- **HTML5 + CSS3** (modern, responsive design)
- **Supabase JS Client** (Auth + Storage + Realtime)

### Backend & Database
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Tables:** `users`, `clients`, `client_sla`, `quality_checks`, `quality_issues`

### Automation & AI
- **n8n** (workflow orchestration)
- **Anthropic Claude Sonnet 4** (vision analysis)
- **Anthropic Claude Haiku** (feedback generation)

### Deployment
- **Vercel** (recommended) or any static hosting
- **Docker** (for n8n local development)

---

## 📁 Project Structure

```
fleetfox-interface/
├── index.html              # Main application entry point
├── fleetapps.html          # Legacy version (deprecated)
├── .gitignore             # Git ignore rules
├── .env.example           # Environment variables template
├── vercel.json            # Vercel deployment config
│
├── js/
│   ├── env-loader.js      # Loads .env file (local dev)
│   ├── config.js          # Configuration manager
│   ├── supabase.js        # Supabase client initialization
│   ├── auth.js            # Authentication module
│   ├── notifications.js   # Real-time notifications
│   ├── onboarding.js      # New user onboarding flow
│   ├── qa-upload.js       # Photo upload & submission
│   ├── dashboard-helpers.js # Dashboard data loading
│   └── app.js             # Main router & application controller
│
├── css/
│   └── styles.css         # All application styles
│
├── docs/
│   └── (documentation files)
│
├── sql/
│   └── (database scripts)
│
└── workflow.json          # n8n workflow export (backup)
```

---

## 🚀 Setup & Installation

### Prerequisites

- **Supabase Account** ([sign up](https://supabase.com))
- **n8n Instance** (local Docker or cloud)
- **Anthropic API Key** (for Claude AI)
- **Git** (for version control)
- **Modern Browser** (Chrome, Firefox, Edge)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/fleetfox-interface.git
cd fleetfox-interface
```

### Step 2: Configure Environment Variables

**For Local Development (Using `.env` file):**

**Required: Use Vercel CLI** to run serverless functions that can read your `.env` file:

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Run local dev server (reads .env file automatically)
vercel dev

# Opens http://localhost:3000
# /api/config will now read from your .env file
```

**Why Vercel CLI?**
- Client-side JavaScript **cannot** directly read `.env` files (browser security)
- Vercel CLI runs your `/api/config.js` serverless function locally
- The serverless function CAN read `process.env` from your `.env` file
- This matches exactly how production works

**Alternative (if you don't want to use Vercel CLI):**
- Edit default values directly in `js/config.js` (but `.env` won't be used)

**For Production (Vercel):**
- Add environment variables in Vercel Dashboard (see Deployment section)

### Step 3: Set Up Supabase

1. **Create Tables:**
   ```sql
   -- Run these in Supabase SQL Editor
   -- See sql/ directory for complete schema
   ```

2. **Enable Realtime:**
   - Go to Database → Replication
   - Enable Realtime for `quality_checks` table

3. **Set Up Storage:**
   - Create bucket: `vehicle-qa-images` (public)
   - Set up RLS policies for your use case

4. **Configure Auth:**
   - Enable Email/Password authentication
   - Set up email templates (optional)

### Step 4: Configure n8n

1. **Import Workflow:**
   - Use `workflow.json` or recreate manually
   - Set up Anthropic credentials in n8n

2. **Configure Webhook:**
   - Set "Response" to: **"Using 'Respond to Webhook' Node"**
   - Get webhook URL and update `N8N_WEBHOOK_URL` in `.env`

3. **Test Workflow:**
   - Send test payload
   - Verify all nodes execute correctly

### Step 5: Run Locally

**Option A: Python HTTP Server**
```bash
python -m http.server 5500
# Open http://localhost:5500
```

**Option B: Node.js HTTP Server**
```bash
npx http-server -p 5500
```

**Option C: VS Code Live Server**
- Install "Live Server" extension
- Right-click **`index.html`** (NOT fleetapps.html) → "Open with Live Server"

---

## ⚙️ Configuration

### Environment Variables

All sensitive configuration is stored in `.env` file (not committed to git).

**Local Development:**
- Create `.env` file from `.env.example`
- `env-loader.js` automatically loads it

**Production (Vercel):**
- Add environment variables in Vercel dashboard
- Or use meta tags in `index.html` (see below)

**Alternative: Meta Tags (for static hosting)**

Add to `index.html` `<head>`:
```html
<meta name="SUPABASE_URL" content="https://your-project.supabase.co">
<meta name="SUPABASE_ANON_KEY" content="your-key">
<meta name="N8N_WEBHOOK_URL" content="https://your-n8n.com/webhook/...">
```

### File Being Used

**✅ `index.html`** - **USE THIS ONE** - Main application (modular structure)
- ✅ Uses separate JS files
- ✅ Role-based authentication  
- ✅ Real-time notifications
- ✅ Modern architecture
- ✅ Secure (loads config from API)
- ✅ **This is what you deploy and use in production**

**⚠️ `fleetapps.html`** - **DO NOT USE** - Legacy version (deprecated)
- ❌ Old monolithic file (everything in one HTML file)
- ❌ No authentication system
- ❌ Hardcoded keys (security risk)
- ⚠️ Can be deleted or kept for reference only
- **Not recommended for new deployments**

---

## 🗄️ Database Schema

### Core Tables

#### `users`
- `id` (UUID, PK) - Links to Supabase Auth
- `email` (VARCHAR)
- `full_name` (VARCHAR)
- `role` (VARCHAR) - 'fox', 'client', 'admin'
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### `clients`
- `id` (UUID, PK)
- `name` (VARCHAR)
- `contact_email` (VARCHAR)
- `contact_phone` (VARCHAR)
- `is_active` (BOOLEAN)

#### `client_sla`
- `id` (UUID, PK)
- `client_id` (VARCHAR) - References clients
- `sla_rules` (JSONB) - Quality standards
- `priority_areas` (TEXT[]) - Critical zones
- `active` (BOOLEAN)

#### `quality_checks`
- `id` (UUID, PK)
- `task_id` (VARCHAR)
- `fox_id` (UUID) - References users
- `client_id` (UUID) - References clients
- `vehicle_id` (VARCHAR)
- `overall_status` (VARCHAR) - 'pass' | 'fail'
- `total_issues` (INTEGER)
- `critical_issues_count` (INTEGER)
- `minor_issues_count` (INTEGER)
- `images_analyzed` (INTEGER)
- `feedback_text` (TEXT)
- `ai_model_used` (VARCHAR)
- `processing_time_seconds` (INTEGER)
- `processing_completed_at` (TIMESTAMP)

#### `quality_issues`
- `id` (UUID, PK)
- `quality_check_id` (UUID) - References quality_checks
- `image_id` (VARCHAR)
- `image_type` (VARCHAR)
- `type` (VARCHAR) - 'dirt' | 'damage' | 'acceptable'
- `location` (VARCHAR)
- `severity` (INTEGER) - 1-10
- `confidence` (INTEGER) - 0-100
- `dirt_category` (VARCHAR)
- `description` (TEXT)

---

## 🔄 Workflow Details

### n8n Workflow Diagram

![FleetFox QA Workflow](./public/Fleetfox%20QA.png)

*Complete n8n workflow showing image processing, AI analysis, SLA application, and feedback generation.*

### n8n Workflow Steps

1. **Webhook Trigger** - Receives photo submission
2. **Validate Input** - Ensures 7 images, no duplicates
3. **Fetch Client SLA** - Gets quality standards
4. **Prepare Batch AI Request** - Formats images for AI
5. **Verify Image Types** - AI validates photo types match declarations
6. **Analyze Images** - Claude Sonnet detects dirt/damage
7. **Parse & Apply SLA Rules** - Filters detections per client rules
8. **Need Feedback?** - If fail, generate feedback
9. **Generate Feedback** - Claude Haiku creates actionable text
10. **Save to Database** - Stores quality check record
11. **Should Notify?** - Send email if needed
12. **Respond to Webhook** - Returns results to frontend

### Key Workflow Features

- **Batch Processing** - All 7 images analyzed together
- **SLA Application** - Client-specific rules applied automatically
- **Error Handling** - Validation at multiple steps
- **Feedback Generation** - Only for failed checks (cost optimization)

---

## 🚢 Deployment

### Live Demo

🌐 **Production Deployment:** [https://fleetfox-ai-qa.vercel.app/](https://fleetfox-ai-qa.vercel.app/)

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

**Environment Variables in Vercel:**
1. Go to your project in [Vercel Dashboard](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `SUPABASE_URL` = `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY` = `your-supabase-anon-key`
   - `N8N_WEBHOOK_URL` = `https://your-n8n-instance.com/webhook/vehicle-qa-trigger`
4. Select **Production**, **Preview**, and **Development** environments
5. **Redeploy** your application for changes to take effect

**How It Works:**
- **Local Development:** 
  - Update default values in `js/config.js` directly, OR
  - Use `vercel dev` to run local serverless functions (reads `.env`)
- **Vercel Production:** Reads from `/api/config` endpoint (serverless function)
- The API route exposes your Vercel environment variables securely

### Alternative: Static Hosting

Works on any static host (Netlify, GitHub Pages, etc.):

1. Upload all files
2. Set environment variables (platform-specific)
3. Update `config.js` to read from meta tags if needed

---

## 📖 Usage Guide

### For Field Workers (Foxes)

1. **Sign Up/Login** - Create account or sign in
2. **Complete Onboarding** - First-time welcome flow
3. **Upload Photos** - 7 required photos (4 exterior + 3 interior)
4. **Submit** - Wait 1-2 minutes for AI analysis
5. **Receive Feedback** - Get instant notification with results

### For Clients

1. **Sign Up/Login** - Access client dashboard
2. **View Reports** - See all quality checks for your vehicles
3. **Notifications** - Get alerts when QA completes

### For Admins

1. **Sign Up/Login** - Access admin dashboard
2. **Manage Users** - Assign roles, view all users
3. **Manage Clients** - Create/update client accounts
4. **View All Checks** - Monitor entire system

---

## 🔧 Development

### Local Development

```bash
# Start local server
python -m http.server 5500

# Start n8n (Docker)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -e N8N_HOST=0.0.0.0 \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=http \
  -e N8N_CORS_ORIGIN="http://localhost:5500" \
  n8nio/n8n
```

### Code Structure

- **Modular Design** - Each feature in separate JS file
- **No Dependencies** - Pure vanilla JS (except Supabase library)
- **Easy to Extend** - Add new modules without breaking existing code

### Adding New Features

1. Create new JS file in `js/` directory
2. Load it in `index.html`
3. Access via global namespace (e.g., `window.myModule`)

---

## 🐛 Troubleshooting

### Common Issues

**1. "Supabase client not initialized"**
- Check `.env` file exists and has correct values
- Verify `config.js` loads before `supabase.js`
- Check browser console for errors

**2. "CORS error" when calling n8n**
- Set `N8N_CORS_ORIGIN` in n8n Docker container
- Include your frontend URL (e.g., `http://localhost:5500`)

**3. Webhook returns "Photos Submitted!" instead of results**
- Check n8n workflow: "Respond to Webhook" node should reference `$node['Parse & Apply SLA Rules']`
- Verify webhook trigger is set to "Using 'Respond to Webhook' Node"

**4. Notifications not appearing**
- Check Supabase Realtime is enabled on `quality_checks` table
- Verify `fox_id` in database matches `user.id` from Auth
- Check browser console for subscription logs

**5. Images not uploading**
- Verify Supabase Storage bucket exists: `vehicle-qa-images`
- Check bucket is public
- Verify RLS policies allow uploads

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

Check console logs for:
- Webhook response data
- Realtime subscription status
- Config loading

---

## 📝 License

MIT License - feel free to use for your projects!

---

## 🤝 Contributing

This is a demo/prototype project. For production use:
- Add proper error handling
- Implement retry logic
- Add rate limiting
- Set up monitoring
- Add tests

---

## 📧 Support

For issues or questions:
- Check `docs/` directory for detailed guides
- Review n8n workflow configuration
- Verify Supabase setup

---

**Built with ❤️ for automated quality assurance**
