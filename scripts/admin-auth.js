// Admin Authentication System
document.addEventListener('DOMContentLoaded', function() {
    // Admin credentials
    const ADMIN_PASSWORD = "1234"; 
    const AUTH_STORAGE_KEY = "elite_barber_admin_auth";
    
    // DOM elements
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const currentDateSpan = document.getElementById('current-date');

    // Initialize authentication
    init();

    function init() {
        updateCurrentDate();
        checkAuthentication();
        setupEventListeners();
    }

    function updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        if (currentDateSpan) {
            currentDateSpan.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    function setupEventListeners() {
        // Login form submission
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Enter key on password field
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLogin(e);
                }
            });
        }
    }

    function checkAuthentication() {
        const authData = getAuthData();
        
        if (authData && authData.isAuthenticated) {
            showAdminPanel();
        } else {
            showLoginScreen();
        }
    }

    function handleLogin(event) {
        event.preventDefault();
        
        const enteredPassword = passwordInput.value.trim();
        
        if (enteredPassword === ADMIN_PASSWORD) {
            // Successful login
            saveAuthData();
            hideLoginError();
            showAdminPanel();
            
            // Clear password field
            passwordInput.value = '';
        } else {
            // Failed login
            showLoginError('Invalid admin password. Please try again.');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    function handleLogout() {
        clearAuthData();
        showLoginScreen();
        
        // Optional: Show logout confirmation
        showLoginMessage('Successfully logged out.', 'success');
    }

    function saveAuthData() {
        const authData = {
            isAuthenticated: true,
            loginTime: new Date().toISOString(),
            sessionId: generateSessionId()
        };
        
        try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        } catch (error) {
            console.warn('Could not save authentication data to localStorage:', error);
        }
    }

    function getAuthData() {
        try {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Could not retrieve authentication data from localStorage:', error);
            return null;
        }
    }

    function clearAuthData() {
        try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (error) {
            console.warn('Could not clear authentication data from localStorage:', error);
        }
    }

    function generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function showAdminPanel() {
        if (loginScreen) loginScreen.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'flex';
        
        // Trigger admin panel initialization if it exists
        if (window.initAdminPanel) {
            window.initAdminPanel();
        }
    }

    function showLoginScreen() {
        if (adminPanel) adminPanel.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
        
        // Focus on password field
        setTimeout(() => {
            if (passwordInput) {
                passwordInput.focus();
            }
        }, 100);
    }

    function showLoginError(message) {
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
            
            // Add shake animation
            loginError.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                loginError.style.animation = '';
            }, 500);
        }
    }

    function hideLoginError() {
        if (loginError) {
            loginError.style.display = 'none';
        }
    }

    function showLoginMessage(message, type = 'info') {
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
            loginError.className = `login-error ${type}`;
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                loginError.style.display = 'none';
                loginError.className = 'login-error';
            }, 3000);
        }
    }

    // Public API
    window.adminAuth = {
        isAuthenticated: function() {
            const authData = getAuthData();
            return authData && authData.isAuthenticated;
        },
        
        logout: handleLogout,
        
        getSessionInfo: function() {
            const authData = getAuthData();
            return authData ? {
                loginTime: authData.loginTime,
                sessionId: authData.sessionId
            } : null;
        }
    };

    // Add some CSS for animations if not already present
    if (!document.querySelector('#admin-auth-styles')) {
        const style = document.createElement('style');
        style.id = 'admin-auth-styles';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .login-error.success {
                background: rgba(16, 185, 129, 0.1);
                border-color: rgba(16, 185, 129, 0.3);
                color: #10b981;
            }
            
            .login-error.info {
                background: rgba(74, 158, 255, 0.1);
                border-color: rgba(74, 158, 255, 0.3);
                color: #4a9eff;
            }
        `;
        document.head.appendChild(style);
    }

    // Security: Clear password from memory after a delay
    setTimeout(() => {
        // This doesn't actually clear the constant, but it's a security best practice
        // In a real application, you'd want the password to come from a secure server
    }, 5000);
});