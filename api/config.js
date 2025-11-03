// Vercel Serverless Function - Returns environment variables
// This endpoint is safe to expose as it only returns public configuration
// For sensitive keys, use server-side only

export default function handler(req, res) {
    // CORS headers (allow frontend to fetch)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');
    
    // Get environment variables
    const SUPABASE_URL = process.env.SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
    
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

