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
            // Add cache-busting query param to prevent browser caching
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(`/api/config${cacheBuster}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            // Log response status for debugging (even in production for errors)
            if (!response.ok) {
                console.error(`❌ /api/config failed with status: ${response.status} ${response.statusText}`);
                // Try to get error message from response
                try {
                    const errorData = await response.text();
                    console.error('Error response:', errorData.substring(0, 200));
                } catch (e) {
                    // Ignore
                }
                this.tryLocalFallback();
                return;
            }
            
            const data = await response.json();
            
            // Only log success in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('📥 Config loaded from API');
            }
            
            // Check for error from API
            if (data.error) {
                console.error('❌ Config API returned error:', data.error);
                throw new Error(data.error);
            }
            
            // Validate that we got all required values
            if (!data.SUPABASE_URL || !data.SUPABASE_ANON_KEY) {
                console.error('❌ Missing required environment variables in API response');
                throw new Error('Missing required environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel dashboard.');
            }
            
            // Set values from API (no keys exposed in client code!)
            this.SUPABASE_URL = data.SUPABASE_URL;
            this.SUPABASE_ANON_KEY = data.SUPABASE_ANON_KEY;
            this.N8N_WEBHOOK_URL = data.N8N_WEBHOOK_URL;
            this.loaded = true;
            
            // Only log in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('✅ Config loaded from API');
                if (!this.N8N_WEBHOOK_URL) {
                    console.warn('⚠️ N8N_WEBHOOK_URL is not set');
                } else if (this.N8N_WEBHOOK_URL.includes('localhost')) {
                    console.warn('⚠️ N8N_WEBHOOK_URL points to localhost');
                }
            }
        } catch (error) {
            // API not available - log error and try local fallback
            console.error('❌ Failed to load config from API:', error.message);
            this.tryLocalFallback();
        } finally {
            this.loading = false;
        }
    }

    // Local development fallback (only works on localhost)
    tryLocalFallback() {
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'file:';
        
        if (!isLocalhost) {
            // Production - this should not happen if /api/config is working
            // The API endpoint should be available in production
            console.error('❌ /api/config endpoint failed in production. Possible causes:');
            console.error('   1. Environment variables not set in Vercel dashboard');
            console.error('   2. Serverless function not deployed correctly');
            console.error('   3. Check Vercel function logs for errors');
            console.error('   → Go to Vercel dashboard → Your Project → Functions → /api/config');
            this.loaded = true;
            return;
        }
        
        // Local development - check localStorage for dev config
        const devConfig = localStorage.getItem('dev_config');
        if (devConfig) {
            try {
                const config = JSON.parse(devConfig);
                this.SUPABASE_URL = config.SUPABASE_URL;
                this.SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
                this.N8N_WEBHOOK_URL = config.N8N_WEBHOOK_URL;
                this.loaded = true;
                console.log('✅ Using local development config from localStorage');
                return;
            } catch (e) {
                console.error('Failed to parse dev_config from localStorage');
            }
        }
        
        // No local config found - show instructions only in development
        console.error('❌ No configuration available.');
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.error('💡 Options:');
            console.error('   1. Run "npm i -g vercel && vercel dev" to use .env file');
            console.error('   2. Set localStorage.dev_config = JSON.stringify({SUPABASE_URL: "...", SUPABASE_ANON_KEY: "...", N8N_WEBHOOK_URL: "..."})');
        }
        this.loaded = true;
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

