// Authentication module
class Auth {
    constructor() {
        this.user = null;
        this.session = null;
    }

    // Initialize auth state
    async init() {
        // Wait for supabaseClient to be ready
        let attempts = 0;
        while (!window.supabaseClient && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }

        try {
            const { data: { session }, error } = await window.supabaseClient.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            this.session = session;
            this.user = session?.user || null;
            return this.user;
        } catch (error) {
            console.error('Error initializing auth:', error);
            return null;
        }
    }

    // Listen for auth state changes
    onAuthStateChange(callback) {
        // Wait for supabaseClient to be ready
        const setupListener = () => {
            if (window.supabaseClient) {
                window.supabaseClient.auth.onAuthStateChange((event, session) => {
                    this.session = session;
                    this.user = session?.user || null;
                    callback(event, this.user);
                });
            } else {
                setTimeout(setupListener, 100);
            }
        };
        setupListener();
    }

    // Sign up new user - ALL USERS DEFAULT TO 'fox' (field worker)
    // Admins must manually assign roles via dashboard
    async signUp(email, password, fullName) {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase client not initialized' };
        }
        try {
            // Check if email matches a client (optional: auto-assign client role)
            let defaultRole = 'fox'; // Default to field worker
            let clientId = null;
            
            try {
                const { data: clientData } = await window.supabaseClient
                    .from('clients')
                    .select('id, contact_email')
                    .eq('contact_email', email)
                    .single();
                
                if (clientData) {
                    defaultRole = 'client';
                    clientId = clientData.id;
                }
            } catch (e) {
                // No client match, use default 'fox'
            }
            
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            if (error) throw error;
            
            // Save to users table - default role is 'fox' unless email matches client
            if (data.user) {
                try {
                    // Build user record (only include client_id if column exists)
                    const userRecord = {
                        id: data.user.id,
                        email: data.user.email,
                        full_name: fullName,
                        role: defaultRole,
                        is_active: true,
                        created_at: new Date().toISOString()
                    };
                    
                    // Don't add client_id - column doesn't exist in schema yet
                    // If you add the column later, uncomment this:
                    // if (clientId) {
                    //     userRecord.client_id = clientId;
                    // }
                    
                    await window.supabaseClient
                        .from('users')
                        .upsert(userRecord, { onConflict: 'id' });
                } catch (dbError) {
                    // If client_id column doesn't exist, try again without it
                    if (dbError.code === '42703' && clientId) {
                        try {
                            await window.supabaseClient
                                .from('users')
                                .upsert({
                                    id: data.user.id,
                                    email: data.user.email,
                                    full_name: fullName,
                                    role: defaultRole,
                                    is_active: true,
                                    created_at: new Date().toISOString()
                                }, { onConflict: 'id' });
                        } catch (retryError) {
                            console.warn('Could not save user to database, but auth succeeded:', retryError);
                        }
                    } else {
                        console.warn('Could not save user to database, but auth succeeded:', dbError);
                    }
                    // Continue anyway - auth succeeded
                }
            }
            
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get user role from database
    async getUserRole() {
        if (!this.user) return 'fox'; // Default fallback
        
        try {
            if (!window.supabaseClient) {
                console.warn('Supabase client not initialized, defaulting to fox role');
                return 'fox';
            }
            
            const { data, error } = await window.supabaseClient
                .from('users')
                .select('role')  // Only select role - client_id column doesn't exist yet
                .eq('id', this.user.id)
                .single();
            
            // PGRST116 = no rows returned (user not in users table yet)
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('User not found in users table, defaulting to fox role');
                    return 'fox';
                } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    console.warn('users table does not exist, defaulting to fox role');
                    return 'fox';
                } else if (error.code === '42703' && error.message?.includes('client_id')) {
                    // Column doesn't exist - ignore this error and return default
                    console.log('client_id column does not exist (expected), defaulting to fox role');
                    return 'fox';
                } else {
                    console.warn('Error fetching user role:', error.message || error.code || error);
                    return 'fox'; // Default fallback on any error
                }
            }
            
            return data?.role || 'fox'; // Default to 'fox' if no role set
        } catch (error) {
            console.warn('Exception getting user role:', error.message || error);
            return 'fox'; // Default fallback
        }
    }

    // Get client_id for a user (if they are a client or linked to a client)
    async getUserClientId() {
        if (!this.user) return null;
        
        try {
            if (!window.supabaseClient) return null;
            
            // Check if client_id column exists by trying to select it
            // If column doesn't exist, we'll get an error and handle it gracefully
            try {
                const { data, error } = await window.supabaseClient
                    .from('users')
                    .select('client_id')
                    .eq('id', this.user.id)
                    .single();
                
                // If column doesn't exist, error code will be 42703
                if (error && error.code === '42703') {
                    console.log('client_id column does not exist in users table');
                    return null;
                }
                
                if (!error && data?.client_id) {
                    return data.client_id;
                }
            } catch (err) {
                // Column doesn't exist, return null
                if (err.code === '42703') {
                    return null;
                }
                throw err;
            }
            
            // Option 2: Match by email in clients table
            const { data: clientData, error: clientError } = await window.supabaseClient
                .from('clients')
                .select('id')
                .eq('contact_email', this.user.email)
                .eq('is_active', true)
                .single();
            
            if (!clientError && clientData?.id) {
                return clientData.id;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting client ID:', error);
            return null;
        }
    }

    // Sign in
    async signIn(email, password) {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase client not initialized' };
        }
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            this.user = data.user;
            this.session = data.session;
            
            // Ensure user record exists in users table (for foreign key constraints)
            if (data.user) {
                try {
                    // Check if user exists
                    const { error: fetchError } = await window.supabaseClient
                        .from('users')
                        .select('id')
                        .eq('id', data.user.id)
                        .single();
                    
                    // If user doesn't exist (PGRST116 = no rows), create it
                    if (fetchError && fetchError.code === 'PGRST116') {
                        const userRecord = {
                            id: data.user.id,
                            email: data.user.email,
                            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                            role: 'fox', // Default to fox
                            is_active: true,
                            created_at: new Date().toISOString()
                        };
                        
                        await window.supabaseClient
                            .from('users')
                            .insert(userRecord);
                    }
                } catch (dbError) {
                    // Non-critical - log but don't fail sign-in
                    console.warn('Could not ensure user record exists:', dbError.message || dbError);
                }
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Sign out
    async signOut() {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase client not initialized' };
        }
        try {
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;
            this.user = null;
            this.session = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.user;
    }

    // Get user onboarding status
    async getOnboardingStatus() {
        if (!this.user) return { completed: false };
        
        // Check localStorage as fallback
        const localStatus = localStorage.getItem(`onboarding_completed_${this.user.id}`);
        if (localStatus === 'true') {
            return { completed: true };
        }
        
        try {
            if (!window.supabaseClient) return { completed: false };
            const { data, error } = await window.supabaseClient
                .from('users')
                .select('onboarding_completed')
                .eq('id', this.user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                // If permission error, use localStorage
                if (error.code === '42501' || error.message?.includes('permission')) {
                    console.warn('Permission error reading onboarding status, using localStorage');
                    return { completed: localStatus === 'true' };
                }
                throw error;
            }
            
            const completed = data?.onboarding_completed || false;
            // Cache in localStorage
            if (completed) {
                localStorage.setItem(`onboarding_completed_${this.user.id}`, 'true');
            }
            return { completed };
        } catch (error) {
            console.error('Error fetching onboarding status:', error);
            // Fallback to localStorage
            return { completed: localStatus === 'true' };
        }
    }

    // Mark onboarding as completed
    async completeOnboarding() {
        if (!this.user) {
            console.warn('No user found, cannot complete onboarding');
            return { success: false, error: 'No authenticated user' };
        }
        
        try {
            if (!window.supabaseClient) {
                console.error('Supabase client not initialized');
                return { success: false, error: 'Database connection not available' };
            }

            // Try to upsert user record
            const userData = {
                id: this.user.id,
                email: this.user.email,
                onboarding_completed: true
            };

            // First try to update if exists
            const { data: existingUser, error: fetchError } = await window.supabaseClient
                .from('users')
                .select('id')
                .eq('id', this.user.id)
                .single();

            let error;
            
            if (fetchError && fetchError.code === 'PGRST116') {
                // User doesn't exist, try to insert
                const { error: insertError } = await window.supabaseClient
                    .from('users')
                    .insert(userData);
                error = insertError;
            } else if (!fetchError) {
                // User exists, try to update
                const { error: updateError } = await window.supabaseClient
                    .from('users')
                    .update({
                        onboarding_completed: true
                    })
                    .eq('id', this.user.id);
                error = updateError;
            } else {
                error = fetchError;
            }
            
            if (error) {
                console.error('Database error:', error);
                // If it's a permission/RLS error OR column doesn't exist, still allow onboarding to complete
                // The user can still use the app - store in localStorage
                if (error.code === '42501' || error.code === '42703' || 
                    error.message?.includes('permission') || 
                    error.message?.includes('RLS') || 
                    error.message?.includes('relation') ||
                    error.message?.includes('column') ||
                    error.message?.includes('schema cache')) {
                    console.warn('Database error, but allowing onboarding to proceed (storing in localStorage)');
                    localStorage.setItem(`onboarding_completed_${this.user.id}`, 'true');
                    return { success: true, warning: 'Database error, but onboarding marked as complete locally' };
                }
                throw error;
            }
            
            // Also store in localStorage as backup
            localStorage.setItem(`onboarding_completed_${this.user.id}`, 'true');
            return { success: true };
        } catch (error) {
            console.error('Error completing onboarding:', error);
            return { success: false, error: error.message || 'Database error' };
        }
    }
}

// Export singleton instance
window.auth = new Auth();

