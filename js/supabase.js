// Supabase client configuration
// Reads from window.config (loaded from config.js via API)
// NO KEYS EXPOSED - all values come from /api/config endpoint

// Initialize Supabase client when library and config are loaded
async function initSupabase() {
    // Wait for config to load from API
    if (window.config) {
        await window.config.waitForLoad();
    } else {
        // Config not loaded yet, wait a bit
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.config) {
            await window.config.waitForLoad();
        }
    }
    
    if (typeof supabase !== 'undefined' && window.config) {
        const config = window.config;
        
        // Validate config is loaded
        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            console.error('❌ Supabase config not loaded. Make sure /api/config is available.');
            console.error('💡 Run "vercel dev" to use .env file, or deploy to Vercel');
            return;
        }
        
        window.supabaseClient = supabase.createClient(
            config.SUPABASE_URL, 
            config.SUPABASE_ANON_KEY
        );
        console.log('✅ Supabase client initialized');
    } else {
        // Retry after a short delay if library not loaded yet
        setTimeout(initSupabase, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSupabase, 100);
});

