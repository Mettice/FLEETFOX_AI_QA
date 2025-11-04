// Vercel Serverless Function - Returns environment variables
// This endpoint is safe to expose as it only returns public configuration
// For sensitive keys, use server-side only

export default function handler(req, res) {
    try {
        // CORS headers (allow frontend to fetch)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json');
        // Prevent caching of config response
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Handle OPTIONS request (CORS preflight)
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        // Get environment variables from Vercel (automatically loaded from dashboard)
        const SUPABASE_URL = process.env.SUPABASE_URL || '';
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
        const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
        
        // Always log in Vercel function logs (for debugging production issues)
        console.log('🔍 API Config endpoint called:', {
            hasSupabaseUrl: !!SUPABASE_URL,
            hasSupabaseKey: !!SUPABASE_ANON_KEY,
            hasN8nUrl: !!N8N_WEBHOOK_URL,
            vercelEnv: process.env.VERCEL_ENV || 'unknown',
            method: req.method
        });
        
        // Check if required vars are missing
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('❌ Missing required environment variables in Vercel');
            console.error('   SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
            console.error('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
            // Still return 200 but with empty values - frontend will handle the error
            return res.status(200).json({
                SUPABASE_URL: SUPABASE_URL,
                SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
                N8N_WEBHOOK_URL: N8N_WEBHOOK_URL,
                error: 'Missing environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel dashboard → Settings → Environment Variables.'
            });
        }
        
        // Return only public/safe environment variables
        // SUPABASE_ANON_KEY is meant to be public (it's the anon key)
        res.status(200).json({
            SUPABASE_URL: SUPABASE_URL,
            SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
            N8N_WEBHOOK_URL: N8N_WEBHOOK_URL
        });
    } catch (error) {
        // Catch any errors in the function
        console.error('❌ Error in /api/config function:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error in config endpoint',
            message: error.message
        });
    }
}
