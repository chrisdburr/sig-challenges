/**
 * Supabase Client Configuration
 * Handles authentication and database operations
 */

class SupabaseManager {
    constructor() {
        // Initialize Supabase client (URLs will be injected at runtime)
        this.supabaseUrl = null;
        this.supabaseAnonKey = null;
        this.supabase = null;
        this.currentUser = null;
        this.authStateListeners = [];
        
        this.init();
    }
    
    async init() {
        // In development, load from environment
        // In production, these would be injected during build
        try {
            const config = await this.loadConfig();
            this.supabaseUrl = config.url;
            this.supabaseAnonKey = config.anonKey;
            
            // Initialize Supabase client
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
            
            // Set up auth state listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                this.currentUser = session?.user || null;
                this.notifyAuthStateListeners(event, session);
            });
            
            console.log('✅ Supabase client initialized');
            
            // Debug: Check current auth state
            const { data: { session } } = await this.supabase.auth.getSession();
            console.log('Initial session:', session);
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
        }
    }
    
    async loadConfig() {
        // For development - in production these would be build-time constants
        return {
            url: 'https://frabxpcsgftavojxoipx.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYWJ4cGNzZ2Z0YXZvanhvaXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5OTYyMzUsImV4cCI6MjA2NTU3MjIzNX0.nsHbdIW_F1QePwCPu4vL_eZoxd2ZYJxVl0ux68dxVY8'
        };
    }
    
    // Auth state management
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
    }
    
    notifyAuthStateListeners(event, session) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(event, session);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }
    
    // Authentication methods
    async signUp(email, password, displayName = null) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName
                    }
                }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Data fetching methods
    async fetchChallenges() {
        try {
            const { data, error } = await this.supabase
                .from('challenge_ratings_aggregate')
                .select('*')
                .order('number');
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Fetch challenges error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async fetchChallenge(challengeId) {
        try {
            const { data, error } = await this.supabase
                .from('challenge_ratings_aggregate')
                .select('*')
                .eq('id', challengeId)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Fetch challenge error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async fetchChallengeCapabilities(challengeId) {
        try {
            const { data, error } = await this.supabase
                .from('challenge_capabilities')
                .select('capability_id')
                .eq('challenge_id', challengeId);
            
            if (error) throw error;
            return { success: true, data: data.map(item => item.capability_id) };
        } catch (error) {
            console.error('Fetch capabilities error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async fetchUserRating(challengeId) {
        if (!this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('user_ratings')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('challenge_id', challengeId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return { success: true, data };
        } catch (error) {
            console.error('Fetch user rating error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Rating submission methods
    async submitRating(challengeId, ratings) {
        if (!this.currentUser) {
            return { success: false, error: 'Authentication required' };
        }
        
        try {
            const ratingData = {
                user_id: this.currentUser.id,
                challenge_id: challengeId,
                significance_rating: ratings.significance,
                complexity_rating: ratings.complexity,
                readiness_rating: ratings.readiness
            };
            
            // Use upsert to handle both insert and update
            const { data, error } = await this.supabase
                .from('user_ratings')
                .upsert(ratingData, {
                    onConflict: 'user_id,challenge_id'
                })
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Submit rating error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Real-time subscriptions
    subscribeToRatings(callback) {
        if (!this.supabase) return null;
        
        return this.supabase
            .channel('rating-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'user_ratings' 
                }, 
                callback
            )
            .subscribe();
    }
    
    unsubscribe(subscription) {
        if (subscription) {
            this.supabase.removeChannel(subscription);
        }
    }
    
    // Utility methods
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    async waitForInit() {
        // Wait for Supabase client to be initialized
        let attempts = 0;
        while (!this.supabase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        return !!this.supabase;
    }
}

// Global instance
window.supabaseManager = new SupabaseManager();