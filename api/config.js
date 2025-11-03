// Vercel Serverless Function - Returns environment variables
// This endpoint is safe to expose as it only returns public configuration
// For sensitive keys, use server-side only

export default function handler(req, res) {
    // CORS headers (allow frontend to fetch)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');
    
    // Return only public/safe environment variables
    // SUPABASE_ANON_KEY is meant to be public (it's the anon key)
    res.status(200).json({
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || ''
    });
}

