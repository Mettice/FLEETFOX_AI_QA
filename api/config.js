// Vercel Serverless Function - Returns environment variables
// This endpoint is safe to expose as it only returns public configuration
// For sensitive keys, use server-side only

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
    
    console.log('🔍 API Config loaded:', {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_ANON_KEY,
        hasN8nUrl: !!N8N_WEBHOOK_URL,
        n8nUrlPreview: n8nUrlPreview,
        isLocalhost: isLocalhost,
        fullN8nUrl: N8N_WEBHOOK_URL || 'NOT SET' // Log full URL in server logs only
    });
    
    // Warn if localhost URL in production
    if (isLocalhost) {
        console.warn('⚠️ WARNING: N8N_WEBHOOK_URL is localhost - this will NOT work from production Vercel deployment!');
        console.warn('⚠️ You need a publicly accessible n8n instance (n8n.cloud or self-hosted with public URL)');
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

