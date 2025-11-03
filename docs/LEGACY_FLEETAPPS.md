# ⚠️ Legacy File: fleetapps.html

**This file is deprecated and should NOT be used for new deployments.**

## Status: Legacy / Deprecated

The `fleetapps.html` file is the **old monolithic version** of the application. It has been replaced by the modern modular structure in `index.html`.

## Why It's Deprecated

- ❌ **All code in one file** - Hard to maintain
- ❌ **No authentication system** - No user management
- ❌ **No onboarding flow** - Poor UX
- ❌ **Hardcoded API keys** - Security risk (exposed in HTML)
- ❌ **No role-based dashboards** - Limited functionality
- ❌ **No real-time notifications** - Missing key feature

## What to Use Instead

**✅ Use `index.html`** - The modern, modular application with:
- Modular JavaScript architecture
- Full authentication system
- Role-based dashboards (Fox, Client, Admin)
- Real-time notifications
- Secure configuration via `/api/config`
- Onboarding flow for new users

## Can I Still Use fleetapps.html?

**Technically yes, but not recommended:**
- It still works for basic photo uploads
- But you'll miss all new features
- Security vulnerabilities (exposed keys)
- No updates or bug fixes planned

## Migration Path

If you're currently using `fleetapps.html`:
1. Switch to `index.html` 
2. Test authentication flow
3. Verify photo uploads work
4. Remove `fleetapps.html` once confirmed working

---

**For new projects: Use `index.html` only.**

