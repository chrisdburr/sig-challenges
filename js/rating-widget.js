/**
 * Interactive Rating Widget
 * Handles user ratings with real-time updates and visual feedback
 */

class RatingWidget {
    constructor(challengeId, ratingType, currentValue = 0, userRating = 0, communityData = null, supabaseClient = null) {
        this.challengeId = challengeId;
        this.ratingType = ratingType; // 'significance', 'complexity', 'readiness'
        this.currentValue = currentValue; // Original static rating
        this.userRating = userRating; // User's current rating (0 if not rated)
        this.communityData = communityData; // { average, count }
        this.supabaseClient = supabaseClient;
        this.isSubmitting = false;
        this.element = null;
        
        // Event handlers
        this.onRatingChange = null; // Callback for when rating changes
        this.onError = null; // Callback for errors
    }

    /**
     * Generate HTML for the rating widget
     */
    toHTML() {
        const displayAverage = this.communityData ? this.communityData.average : this.currentValue;
        const ratingCount = this.communityData ? this.communityData.count : 0;
        const hasUserRating = this.userRating > 0;
        
        return `
            <div class="rating-widget" data-challenge-id="${this.challengeId}" data-rating-type="${this.ratingType}">
                <div class="rating-header">
                    <h6 class="rating-title">${this.getRatingTitle()}</h6>
                    <div class="community-stats">
                        <small class="text-muted">
                            Community: ${displayAverage.toFixed(1)} ⭐ 
                            ${ratingCount > 0 ? `(${ratingCount} rating${ratingCount !== 1 ? 's' : ''})` : '(No ratings yet)'}
                        </small>
                    </div>
                </div>
                
                <div class="rating-interactive">
                    <div class="stars-container" data-rating="${this.userRating}">
                        ${this.generateStars()}
                    </div>
                    <div class="rating-feedback">
                        <small class="rating-status ${hasUserRating ? 'user-rated' : 'not-rated'}">
                            ${hasUserRating 
                                ? `You rated: ${this.userRating}⭐` 
                                : (this.isAuthenticated() ? 'Click to rate' : 'Sign in to rate')
                            }
                        </small>
                    </div>
                </div>
                
                <div class="rating-loading" style="display: none;">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Saving...</span>
                    </div>
                    <small class="ms-2">Saving rating...</small>
                </div>
            </div>
        `;
    }

    /**
     * Generate star HTML
     */
    generateStars() {
        let starsHTML = '';
        for (let i = 1; i <= 3; i++) {
            const isFilled = i <= this.userRating;
            starsHTML += `
                <i class="star ${isFilled ? 'fas' : 'far'} fa-star" 
                   data-value="${i}" 
                   title="Rate ${i} star${i !== 1 ? 's' : ''}"></i>
            `;
        }
        return starsHTML;
    }

    /**
     * Initialize the widget after HTML is inserted into DOM
     */
    initialize(containerElement) {
        this.element = containerElement;
        this.attachEventListeners();
        this.updateVisualState();
    }

    /**
     * Attach event listeners to stars
     */
    attachEventListeners() {
        const starsContainer = this.element.querySelector('.stars-container');
        const stars = this.element.querySelectorAll('.star');

        stars.forEach((star, index) => {
            // Hover effects
            star.addEventListener('mouseenter', () => {
                if (!this.isAuthenticated() || this.isSubmitting) return;
                this.highlightStars(index + 1);
            });

            // Click to rate
            star.addEventListener('click', async () => {
                if (!this.isAuthenticated()) {
                    this.showAuthRequired();
                    return;
                }
                
                if (this.isSubmitting) return;
                
                const rating = index + 1;
                await this.submitRating(rating);
            });
        });

        // Reset hover state when leaving stars area
        starsContainer.addEventListener('mouseleave', () => {
            this.updateStarDisplay();
        });
    }

    /**
     * Highlight stars on hover
     */
    highlightStars(rating) {
        const stars = this.element.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.className = index < rating 
                ? 'star fas fa-star star-hover' 
                : 'star far fa-star star-dim';
        });
    }

    /**
     * Update star display to reflect current state
     */
    updateStarDisplay() {
        const stars = this.element.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const isFilled = index < this.userRating;
            star.className = `star ${isFilled ? 'fas' : 'far'} fa-star ${isFilled ? 'star-filled' : ''}`;
        });
    }

    /**
     * Submit rating to backend
     */
    async submitRating(rating) {
        if (!this.supabaseClient) {
            console.error('Supabase client not available');
            return;
        }

        this.isSubmitting = true;
        this.showLoadingState(true);

        try {
            // Optimistic update
            const previousRating = this.userRating;
            this.userRating = rating;
            this.updateVisualState();

            // Submit to Supabase via our manager
            const ratings = {
                significance: this.ratingType === 'significance' ? rating : null,
                complexity: this.ratingType === 'complexity' ? rating : null,
                readiness: this.ratingType === 'readiness' ? rating : null
            };

            const result = await window.supabaseManager.submitRating(this.challengeId, ratings);

            if (!result.success) throw new Error(result.error);

            // Success feedback
            this.showSuccessFeedback();
            
            // Trigger callback
            if (this.onRatingChange) {
                this.onRatingChange(this.challengeId, this.ratingType, rating, previousRating);
            }

            // Refresh community stats (could be optimized with real-time subscription)
            await this.refreshCommunityStats();

        } catch (error) {
            // Revert optimistic update
            this.userRating = previousRating;
            this.updateVisualState();
            
            console.error('Error submitting rating:', error);
            this.showErrorFeedback(error.message);
            
            if (this.onError) {
                this.onError(error);
            }
        } finally {
            this.isSubmitting = false;
            this.showLoadingState(false);
        }
    }

    /**
     * Refresh community statistics
     */
    async refreshCommunityStats() {
        if (!this.supabaseClient) return;

        try {
            const { data, error } = await this.supabaseClient
                .from('challenge_ratings_aggregate')
                .select(`
                    avg_${this.ratingType},
                    total_ratings
                `)
                .eq('id', this.challengeId)
                .single();

            if (error) throw error;

            this.communityData = {
                average: data[`avg_${this.ratingType}`],
                count: data.total_ratings
            };

            this.updateCommunityDisplay();
        } catch (error) {
            console.error('Error refreshing community stats:', error);
        }
    }

    /**
     * Update community stats display
     */
    updateCommunityDisplay() {
        const statsElement = this.element.querySelector('.community-stats small');
        const displayAverage = this.communityData ? this.communityData.average : this.currentValue;
        const ratingCount = this.communityData ? this.communityData.count : 0;
        
        statsElement.innerHTML = `
            Community: ${displayAverage.toFixed(1)} ⭐ 
            ${ratingCount > 0 ? `(${ratingCount} rating${ratingCount !== 1 ? 's' : ''})` : '(No ratings yet)'}
        `;
    }

    /**
     * Update visual state of entire widget
     */
    updateVisualState() {
        this.updateStarDisplay();
        this.updateFeedbackText();
    }

    /**
     * Update feedback text
     */
    updateFeedbackText() {
        const feedbackElement = this.element.querySelector('.rating-status');
        const hasUserRating = this.userRating > 0;
        
        feedbackElement.textContent = hasUserRating 
            ? `You rated: ${this.userRating}⭐` 
            : (this.isAuthenticated() ? 'Click to rate' : 'Sign in to rate');
            
        feedbackElement.className = `rating-status ${hasUserRating ? 'user-rated' : 'not-rated'}`;
    }

    /**
     * Show/hide loading state
     */
    showLoadingState(show) {
        const loadingElement = this.element.querySelector('.rating-loading');
        const interactiveElement = this.element.querySelector('.rating-interactive');
        
        loadingElement.style.display = show ? 'flex' : 'none';
        interactiveElement.style.opacity = show ? '0.5' : '1';
        interactiveElement.style.pointerEvents = show ? 'none' : 'auto';
    }

    /**
     * Show success feedback
     */
    showSuccessFeedback() {
        const star = this.element.querySelector(`.star[data-value="${this.userRating}"]`);
        this.showTooltip(star, 'Rating saved!', 'success');
    }

    /**
     * Show error feedback
     */
    showErrorFeedback(message) {
        const container = this.element.querySelector('.stars-container');
        this.showTooltip(container, `Error: ${message}`, 'error');
    }

    /**
     * Show authentication required message
     */
    showAuthRequired() {
        const container = this.element.querySelector('.stars-container');
        this.showTooltip(container, 'Please sign in to rate challenges', 'info');
        
        // Trigger auth modal (assuming global function exists)
        if (typeof showAuthModal === 'function') {
            setTimeout(showAuthModal, 500);
        }
    }

    /**
     * Show tooltip feedback
     */
    showTooltip(element, message, type = 'info') {
        // Remove any existing tooltips
        const existingTooltip = element.querySelector('.rating-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = `rating-tooltip tooltip-${type}`;
        tooltip.textContent = message;
        
        // Position tooltip
        element.style.position = 'relative';
        element.appendChild(tooltip);
        
        // Remove after delay
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 3000);
    }

    /**
     * Get formatted rating title
     */
    getRatingTitle() {
        const titles = {
            significance: 'Significance',
            complexity: 'Complexity', 
            readiness: 'Readiness'
        };
        return titles[this.ratingType] || this.ratingType;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (window.supabaseManager) {
            return window.supabaseManager.isAuthenticated();
        }
        return false;
    }

    /**
     * Subscribe to real-time updates for this rating
     */
    subscribeToUpdates() {
        if (!this.supabaseClient) return null;

        return this.supabaseClient
            .from(`user_ratings:challenge_id=eq.${this.challengeId}`)
            .on('*', (payload) => {
                // Refresh community stats when any rating changes
                this.refreshCommunityStats();
            })
            .subscribe();
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.subscription) {
            this.supabaseClient.removeSubscription(this.subscription);
        }
    }
}

/**
 * Rating Widget Manager
 * Manages multiple rating widgets and their interactions
 */
class RatingWidgetManager {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.widgets = new Map();
        this.subscriptions = [];
    }

    /**
     * Create and initialize a rating widget
     */
    createWidget(challengeId, ratingType, container, options = {}) {
        const widgetId = `${challengeId}-${ratingType}`;
        
        const widget = new RatingWidget(
            challengeId,
            ratingType,
            options.currentValue || 0,
            options.userRating || 0,
            options.communityData || null,
            this.supabaseClient
        );

        // Set callbacks
        widget.onRatingChange = this.handleRatingChange.bind(this);
        widget.onError = this.handleError.bind(this);

        // Initialize widget
        container.innerHTML = widget.toHTML();
        widget.initialize(container);

        // Store widget
        this.widgets.set(widgetId, widget);

        // Subscribe to updates
        const subscription = widget.subscribeToUpdates();
        if (subscription) {
            this.subscriptions.push(subscription);
        }

        return widget;
    }

    /**
     * Handle rating changes
     */
    handleRatingChange(challengeId, ratingType, newRating, previousRating) {
        console.log(`Rating changed: Challenge ${challengeId}, ${ratingType}: ${previousRating} → ${newRating}`);
        
        // Could trigger other UI updates here
        this.dispatchEvent('ratingChanged', {
            challengeId,
            ratingType,
            newRating,
            previousRating
        });
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('Rating widget error:', error);
        
        // Could show global error message
        this.dispatchEvent('ratingError', { error });
    }

    /**
     * Dispatch custom events
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Load user ratings for a challenge
     */
    async loadUserRatings(challengeId, userId) {
        if (!this.supabaseClient || !userId) return {};

        try {
            const { data, error } = await this.supabaseClient
                .from('user_ratings')
                .select('significance_rating, complexity_rating, readiness_rating')
                .eq('challenge_id', challengeId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found is OK
                throw error;
            }

            return data || {};
        } catch (error) {
            console.error('Error loading user ratings:', error);
            return {};
        }
    }

    /**
     * Clean up all widgets and subscriptions
     */
    destroy() {
        this.widgets.forEach(widget => widget.destroy());
        this.widgets.clear();
        
        this.subscriptions.forEach(subscription => {
            this.supabaseClient.removeSubscription(subscription);
        });
        this.subscriptions = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RatingWidget, RatingWidgetManager };
}