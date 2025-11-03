// Configuration loader - reads from environment variables via API
// NO KEYS ARE HARDCODED HERE - all values come from /api/config endpoint
// /api/config reads from .env (local) or Vercel env vars (production)

class Config {
    constructor() {
        this.loading = false;
        this.loaded = false;
        
        // NO HARDCODED VALUES - all config comes from API
        // This prevents exposing keys in client-side code
        this.SUPABASE_URL = null;
        this.SUPABASE_ANON_KEY = null;
        this.N8N_WEBHOOK_URL = null;
        
        // Initialize config - MUST load from API
        this.init();
    }

    async init() {
        // Always try to fetch from API first (works in both local and production)
        // For local: API route reads from .env via process.env
        // For production: API route reads from Vercel env vars
        await this.loadFromAPI();
    }

    async loadFromAPI() {
        if (this.loading) return;
        this.loading = true;
        
        try {
            // Fetch from API route (reads from .env file via process.env)
            // Works when using 'vercel dev' locally OR in production
            const response = await fetch('/api/config');
            if (response.ok) {
                const data = await response.json();
                
                // Validate that we got all required values
                if (!data.SUPABASE_URL || !data.SUPABASE_ANON_KEY || !data.N8N_WEBHOOK_URL) {
                    throw new Error('Missing required environment variables in API response');
                }
                
                // Set values from API (no keys exposed in client code!)
                this.SUPABASE_URL = data.SUPABASE_URL;
                this.SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY;
                this.N8N_WEBHOOK_URL = data.N8N_WEBHOOK_URL;
                this.loaded = true;
                console.log('✅ Config loaded from API (.env file)');
            } else {
                // API not available - config will be null, app will fail gracefully
                console.error('❌ /api/config failed. Status:', response.status);
                console.error('💡 To fix: Run "vercel dev" to use .env file locally, or deploy to Vercel for production');
                this.loaded = true;
            }
        } catch (error) {
            // API not available - config will be null
            console.error('❌ Failed to load config from API:', error.message);
            console.error('💡 To fix: Run "vercel dev" to use .env file locally, or deploy to Vercel for production');
            this.loaded = true;
        } finally {
            this.loading = false;
        }
    }

    // Wait for config to be loaded
    async waitForLoad() {
        while (!this.loaded && this.loading) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return this.loaded;
    }

    // Get all config as object
    getAll() {
        return {
            SUPABASE_URL: this.SUPABASE_URL,
            SUPABASE_ANON_KEY: this.SUPABASE_ANON_KEY,
            N8N_WEBHOOK_URL: this.N8N_WEBHOOK_URL
        };
    }
}

// Export singleton instance
window.config = new Config();

