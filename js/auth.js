/**
 * Authentication UI Components
 * Handles login/signup modals and authentication state
 */

class AuthManager {
    constructor() {
        this.isModalOpen = false;
        this.currentMode = 'signin'; // 'signin' or 'signup'
        
        this.init();
    }
    
    init() {
        this.createAuthModal();
        this.setupEventListeners();
        
        // Listen for auth state changes
        if (window.supabaseManager) {
            window.supabaseManager.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });
        }
    }
    
    createAuthModal() {
        const modalHTML = `
            <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0">
                            <h5 class="modal-title" id="authModalLabel">Sign In</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="authAlert" class="alert d-none" role="alert"></div>
                            
                            <!-- Sign In Form -->
                            <form id="signinForm" class="auth-form">
                                <div class="mb-3">
                                    <label for="signinEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="signinEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="signinPassword" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="signinPassword" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100 mb-3" id="signinBtn">
                                    Sign In
                                </button>
                                <div class="text-center">
                                    <a href="#" id="showSignup" class="text-decoration-none">Don't have an account? Sign up</a>
                                    <br>
                                    <a href="#" id="showForgotPassword" class="text-decoration-none small">Forgot password?</a>
                                </div>
                            </form>
                            
                            <!-- Sign Up Form -->
                            <form id="signupForm" class="auth-form d-none">
                                <div class="mb-3">
                                    <label for="signupDisplayName" class="form-label">Display Name</label>
                                    <input type="text" class="form-control" id="signupDisplayName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="signupEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="signupEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="signupPassword" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="signupPassword" minlength="8" required>
                                    <div class="form-text">Minimum 8 characters</div>
                                </div>
                                <div class="mb-3">
                                    <label for="signupPasswordConfirm" class="form-label">Confirm Password</label>
                                    <input type="password" class="form-control" id="signupPasswordConfirm" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100 mb-3" id="signupBtn">
                                    Create Account
                                </button>
                                <div class="text-center">
                                    <a href="#" id="showSignin" class="text-decoration-none">Already have an account? Sign in</a>
                                </div>
                            </form>
                            
                            <!-- Forgot Password Form -->
                            <form id="forgotPasswordForm" class="auth-form d-none">
                                <div class="mb-3">
                                    <label for="resetEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="resetEmail" required>
                                    <div class="form-text">We'll send you a password reset link</div>
                                </div>
                                <button type="submit" class="btn btn-primary w-100 mb-3" id="resetBtn">
                                    Send Reset Link
                                </button>
                                <div class="text-center">
                                    <a href="#" id="backToSignin" class="text-decoration-none">Back to sign in</a>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    setupEventListeners() {
        // Modal toggle buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'showSignup') {
                e.preventDefault();
                this.showForm('signup');
            } else if (e.target.id === 'showSignin') {
                e.preventDefault();
                this.showForm('signin');
            } else if (e.target.id === 'showForgotPassword') {
                e.preventDefault();
                this.showForm('forgot');
            } else if (e.target.id === 'backToSignin') {
                e.preventDefault();
                this.showForm('signin');
            }
        });
        
        // Form submissions
        document.getElementById('signinForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignIn();
        });
        
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignUp();
        });
        
        document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
    }
    
    showForm(type) {
        const forms = ['signinForm', 'signupForm', 'forgotPasswordForm'];
        const titles = {
            signin: 'Sign In',
            signup: 'Create Account',
            forgot: 'Reset Password'
        };
        
        forms.forEach(formId => {
            document.getElementById(formId).classList.add('d-none');
        });
        
        let targetForm;
        switch (type) {
            case 'signup':
                targetForm = 'signupForm';
                break;
            case 'forgot':
                targetForm = 'forgotPasswordForm';
                break;
            default:
                targetForm = 'signinForm';
        }
        
        document.getElementById(targetForm).classList.remove('d-none');
        document.getElementById('authModalLabel').textContent = titles[type] || titles.signin;
        this.clearAlert();
        this.currentMode = type;
    }
    
    async handleSignIn() {
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;
        const btn = document.getElementById('signinBtn');
        
        this.setLoading(btn, true);
        this.clearAlert();
        
        const result = await window.supabaseManager.signIn(email, password);
        
        if (result.success) {
            this.showAlert('Successfully signed in!', 'success');
            setTimeout(() => this.closeModal(), 1000);
        } else {
            this.showAlert(result.error, 'danger');
        }
        
        this.setLoading(btn, false);
    }
    
    async handleSignUp() {
        const displayName = document.getElementById('signupDisplayName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
        const btn = document.getElementById('signupBtn');
        
        this.clearAlert();
        
        if (password !== passwordConfirm) {
            this.showAlert('Passwords do not match', 'danger');
            return;
        }
        
        this.setLoading(btn, true);
        
        const result = await window.supabaseManager.signUp(email, password, displayName);
        
        if (result.success) {
            this.showAlert('Account created! Please check your email to verify your account.', 'success');
            setTimeout(() => this.showForm('signin'), 2000);
        } else {
            this.showAlert(result.error, 'danger');
        }
        
        this.setLoading(btn, false);
    }
    
    async handleForgotPassword() {
        const email = document.getElementById('resetEmail').value;
        const btn = document.getElementById('resetBtn');
        
        this.setLoading(btn, true);
        this.clearAlert();
        
        const result = await window.supabaseManager.resetPassword(email);
        
        if (result.success) {
            this.showAlert('Password reset link sent! Check your email.', 'success');
            setTimeout(() => this.showForm('signin'), 2000);
        } else {
            this.showAlert(result.error, 'danger');
        }
        
        this.setLoading(btn, false);
    }
    
    handleAuthStateChange(event, session) {
        const user = session?.user;
        
        if (user) {
            // User signed in
            this.updateAuthUI(true, user);
            if (this.isModalOpen) {
                this.closeModal();
            }
        } else {
            // User signed out
            this.updateAuthUI(false, null);
        }
    }
    
    updateAuthUI(isAuthenticated, user) {
        const authButtons = document.querySelectorAll('[data-auth-required]');
        const guestButtons = document.querySelectorAll('[data-guest-only]');
        
        authButtons.forEach(btn => {
            btn.style.display = isAuthenticated ? 'block' : 'none';
        });
        
        guestButtons.forEach(btn => {
            btn.style.display = isAuthenticated ? 'none' : 'block';
        });
        
        // Update user display
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay && isAuthenticated) {
            const displayName = user.user_metadata?.display_name || user.email;
            userDisplay.textContent = displayName;
        }
    }
    
    showAlert(message, type) {
        const alert = document.getElementById('authAlert');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.classList.remove('d-none');
    }
    
    clearAlert() {
        const alert = document.getElementById('authAlert');
        alert.classList.add('d-none');
    }
    
    setLoading(btn, isLoading) {
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Loading...';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.id.includes('signin') ? 'Sign In' : 
                           btn.id.includes('signup') ? 'Create Account' : 'Send Reset Link';
        }
    }
    
    showModal() {
        console.log('showModal called');
        this.isModalOpen = true;
        this.showForm('signin');
        
        // Ensure Bootstrap is available
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded');
            return;
        }
        
        const modalElement = document.getElementById('authModal');
        if (!modalElement) {
            console.error('Auth modal element not found');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        console.log('Modal should be showing');
    }
    
    closeModal() {
        this.isModalOpen = false;
        const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
        if (modal) {
            modal.hide();
        }
    }
    
    async signOut() {
        const result = await window.supabaseManager.signOut();
        if (result.success) {
            console.log('Signed out successfully');
        }
    }
}

// Initialize auth manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing AuthManager...');
    window.authManager = new AuthManager();
    console.log('AuthManager initialized:', window.authManager);
});

// Fallback for immediate access
if (document.readyState === 'loading') {
    // DOM hasn't finished loading yet
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.authManager) {
            console.log('Fallback: Initializing AuthManager...');
            window.authManager = new AuthManager();
        }
    });
} else {
    // DOM has already loaded
    console.log('DOM ready, initializing AuthManager immediately...');
    window.authManager = new AuthManager();
}

// Global function for HTML onclick handlers
window.showAuthModal = function() {
    console.log('showAuthModal called globally');
    if (window.authManager) {
        window.authManager.showModal();
    } else {
        console.error('AuthManager not available');
        // Try to initialize it
        setTimeout(() => {
            if (!window.authManager) {
                window.authManager = new AuthManager();
            }
            window.authManager.showModal();
        }, 100);
    }
};