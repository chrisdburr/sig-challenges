/**
 * Loading Manager
 * Handles loading states and progress indicators
 */
class LoadingManager {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 4; // Initialize, fetch challenges, fetch capabilities, render cards
        this.isLoading = false;
        
        // DOM elements - initialize in init method when DOM is ready
        this.loadingIndicator = null;
        this.loadingStatus = null;
        this.loadingProgress = null;
        this.cardSection = null;
        
        // Initialize when DOM is ready
        this.init();
    }
    
    // Initialize DOM elements
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.findDOMElements());
        } else {
            this.findDOMElements();
        }
    }
    
    // Find and cache DOM elements
    findDOMElements() {
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.loadingStatus = document.getElementById('loadingStatus');
        this.loadingProgress = document.getElementById('loadingProgress');
        this.cardSection = document.querySelector('.card-section');
        
        console.log('Loading manager DOM elements found:');
        console.log('- loadingIndicator:', this.loadingIndicator);
        console.log('- loadingStatus:', this.loadingStatus);
        console.log('- loadingProgress:', this.loadingProgress);
        console.log('- cardSection:', this.cardSection);
    }
    
    // Start loading process
    startLoading() {
        this.isLoading = true;
        this.currentStep = 0;
        this.updateProgress(0, 'Initializing...');
        
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'block';
        }
        if (this.cardSection) {
            this.cardSection.style.display = 'none';
        }
    }
    
    // Update loading progress
    updateProgress(step, message) {
        this.currentStep = step;
        const percentage = Math.round((step / this.totalSteps) * 100);
        
        if (this.loadingStatus) {
            this.loadingStatus.textContent = message;
        }
        
        if (this.loadingProgress) {
            this.loadingProgress.style.width = `${percentage}%`;
            this.loadingProgress.setAttribute('aria-valuenow', percentage);
        }
        
        console.log(`Loading: ${message} (${percentage}%)`);
    }
    
    // Complete loading and show content
    completeLoading(message = 'Complete!') {
        console.log('CompleteLoading called with message:', message);
        this.isLoading = false;
        this.updateProgress(this.totalSteps, message);
        
        // Show cards after a brief delay for smooth transition
        setTimeout(() => {
            console.log('Hiding loading indicator and showing cards...');
            console.log('loadingIndicator element:', this.loadingIndicator);
            console.log('cardSection element:', this.cardSection);
            
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
                console.log('Loading indicator hidden');
            } else {
                console.error('Loading indicator element not found!');
            }
            
            if (this.cardSection) {
                this.cardSection.style.display = 'block';
                console.log('Card section shown, style:', this.cardSection.style.display);
                // Add fade-in animation
                this.cardSection.style.opacity = '0';
                this.cardSection.style.transition = 'opacity 0.5s ease-in';
                setTimeout(() => {
                    this.cardSection.style.opacity = '1';
                    console.log('Cards fade-in complete');
                }, 50);
            } else {
                console.error('Card section element not found!');
            }
        }, 500);
    }
    
    // Show error state
    showError(message) {
        this.isLoading = false;
        
        if (this.loadingStatus) {
            this.loadingStatus.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </span>
            `;
        }
        
        if (this.loadingProgress) {
            this.loadingProgress.classList.remove('bg-primary');
            this.loadingProgress.classList.add('bg-danger');
        }
        
        // Still show cards if available (fallback might have worked)
        setTimeout(() => {
            if (this.cardSection) {
                this.cardSection.style.display = 'block';
            }
        }, 2000);
    }
    
    // Set specific loading messages for different steps
    setStepMessage(step, message) {
        const steps = {
            0: 'Initializing Supabase...',
            1: 'Fetching challenges from database...',
            2: 'Loading challenge capabilities...',
            3: 'Rendering challenge cards...',
            4: 'Complete!'
        };
        
        return steps[step] || message;
    }
    
    // Convenience methods for specific steps
    initializingSupabase() {
        this.updateProgress(0, this.setStepMessage(0));
    }
    
    fetchingChallenges() {
        this.updateProgress(1, this.setStepMessage(1));
    }
    
    fetchingCapabilities() {
        this.updateProgress(2, this.setStepMessage(2));
    }
    
    renderingCards() {
        this.updateProgress(3, this.setStepMessage(3));
    }
    
    // Check if currently loading
    isCurrentlyLoading() {
        console.log('isCurrentlyLoading called, returning:', this.isLoading);
        return this.isLoading;
    }
}

// Global loading manager instance
window.loadingManager = new LoadingManager();