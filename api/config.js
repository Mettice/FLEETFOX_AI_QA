// Vercel Serverless Function - Returns environment variables
// This endpoint is safe to expose as it only returns public configuration
// For sensitive keys, use server-side only

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env file in development (vercel dev)
// Vercel dev should auto-load .env, but sometimes it doesn't work
// Try to load .env file - only works in local development, not production
try {
    // Try multiple possible locations for .env file
    // Note: process.cwd() should work even with spaces in path
    const possiblePaths = [
        path.join(process.cwd(), '.env'),           // Current working directory
        path.join(__dirname, '..', '.env'),         // One level up from api/ folder
        path.join(__dirname, '..', '..', '.env'),  // Two levels up
        path.resolve('.env'),                       // Absolute path from current dir
        path.resolve(process.cwd(), '.env'),        // Explicit resolve with cwd
    ];
    
    let envPath = null;
    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            envPath = possiblePath;
            break;
        }
    }
    
    if (envPath && fs.existsSync(envPath)) {
        // Read file and remove BOM if present
        let envContent = fs.readFileSync(envPath, 'utf8');
        // Remove UTF-8 BOM if present
        if (envContent.charCodeAt(0) === 0xFEFF) {
            envContent = envContent.slice(1);
        }
        
        let loadedCount = 0;
        const lines = envContent.split(/\r?\n/);
        
        lines.forEach((line) => {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (trimmed && !trimmed.startsWith('#')) {
                const equalIndex = trimmed.indexOf('=');
                if (equalIndex > 0) {
                    const key = trimmed.substring(0, equalIndex).trim();
                    const value = trimmed.substring(equalIndex + 1).trim();
                    // Remove quotes if present
                    const cleanValue = value.replace(/^["']|["']$/g, '');
                    // Only set if not already in process.env (don't override)
                    if (!process.env[key] && cleanValue) {
                        process.env[key] = cleanValue;
                        loadedCount++;
                    }
                }
            }
        });
        
        // Only log in development (vercel dev)
        if (process.env.VERCEL_ENV !== 'production' && loadedCount > 0) {
            console.log(`✅ Loaded ${loadedCount} variable(s) from .env file`);
        }
    }
} catch (error) {
    // Silently fail - vercel dev should handle it, or it's production
    // Only log errors in development
    if (process.env.VERCEL_ENV !== 'production') {
        console.log('⚠️ Could not load .env file (using Vercel env vars instead)');
    }
}

export default function handler(req, res) {
    // CORS headers (allow frontend to fetch)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');
    // Prevent caching of config response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Get environment variables
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
    
    // Log what we're reading (for debugging - don't log actual keys)
    // Also log full URL to Vercel function logs for debugging
    const n8nUrlPreview = N8N_WEBHOOK_URL ? 
        `${N8N_WEBHOOK_URL.substring(0, 50)}...` : 'NOT SET';
    const isLocalhost = N8N_WEBHOOK_URL && 
        (N8N_WEBHOOK_URL.includes('localhost') || N8N_WEBHOOK_URL.includes('127.0.0.1'));
    
    // Only log in development (not in production)
    if (process.env.VERCEL_ENV !== 'production') {
        console.log('🔍 API Config loaded:', {
            hasSupabaseUrl: !!SUPABASE_URL,
            hasSupabaseKey: !!SUPABASE_ANON_KEY,
            hasN8nUrl: !!N8N_WEBHOOK_URL,
            n8nUrlPreview: n8nUrlPreview,
            isLocalhost: isLocalhost
        });
        
        // Warn if localhost URL in development
        if (isLocalhost) {
            console.warn('⚠️ N8N_WEBHOOK_URL is localhost - this will NOT work from production!');
        }
    }
    
    // Check if required vars are missing
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('Missing required environment variables in Vercel');
        // Still return 200 but with empty values - frontend will handle the error
        return res.status(200).json({
            SUPABASE_URL: SUPABASE_URL,
            SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
            N8N_WEBHOOK_URL: N8N_WEBHOOK_URL,
            error: 'Missing environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel dashboard.'
        });
    }
    
    // Return only public/safe environment variables
    // SUPABASE_ANON_KEY is meant to be public (it's the anon key)
    res.status(200).json({
        SUPABASE_URL: SUPABASE_URL,
        SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
        N8N_WEBHOOK_URL: N8N_WEBHOOK_URL
    });
}

