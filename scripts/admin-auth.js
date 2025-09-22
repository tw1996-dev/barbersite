/**
 * Admin Authentication System - Frontend
 * Handles login/logout with secure backend authentication
 * No hardcoded passwords - all validation done server-side
 */
document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
  const loginScreen = document.getElementById("login-screen");
  const adminPanel = document.getElementById("admin-panel");
  const loginForm = document.getElementById("login-form");
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");
  const currentDateSpan = document.getElementById("current-date");

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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    if (currentDateSpan) {
      currentDateSpan.textContent = now.toLocaleDateString("en-US", options);
    }
  }

  function setupEventListeners() {
    // Login form submission
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    // Enter key on password field
    if (passwordInput) {
      passwordInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          handleLogin(e);
        }
      });
    }
  }

  /**
   * Check if user is authenticated by verifying token with server
   */
  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          showAdminPanel();
          return;
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }

    // If verification failed, show login screen
    showLoginScreen();
  }

  /**
   * Handle login form submission
   * Sends password to server for secure verification
   */
  async function handleLogin(event) {
    event.preventDefault();

    const enteredPassword = passwordInput.value.trim();

    if (!enteredPassword) {
      showLoginError("Please enter a password.");
      return;
    }

    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Logging in...";
    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({
          password: enteredPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Successful login
        hideLoginError();
        showAdminPanel();
        passwordInput.value = "";
      } else {
        // Failed login
        showLoginError(data.error || "Invalid password. Please try again.");
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (error) {
      console.error("Login error:", error);
      showLoginError("Connection error. Please try again.");
    } finally {
      // Restore button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  /**
   * Handle logout
   * Clears server session and redirects to login
   */
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Always show login screen, even if logout request failed
    showLoginScreen();
    showLoginMessage("Successfully logged out.", "success");
  }

  function showAdminPanel() {
    if (loginScreen) loginScreen.style.display = "none";
    if (adminPanel) adminPanel.style.display = "flex";

    // Trigger admin panel initialization if it exists
    if (window.initAdminPanel) {
      window.initAdminPanel();
    }
  }

  function showLoginScreen() {
    if (adminPanel) adminPanel.style.display = "none";
    if (loginScreen) loginScreen.style.display = "flex";

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
      loginError.style.display = "block";

      // Add shake animation
      loginError.style.animation = "shake 0.5s ease-in-out";
      setTimeout(() => {
        loginError.style.animation = "";
      }, 500);
    }
  }

  function hideLoginError() {
    if (loginError) {
      loginError.style.display = "none";
    }
  }

  function showLoginMessage(message, type = "info") {
    if (loginError) {
      loginError.textContent = message;
      loginError.style.display = "block";
      loginError.className = `login-error ${type}`;

      // Auto-hide after 3 seconds
      setTimeout(() => {
        loginError.style.display = "none";
        loginError.className = "login-error";
      }, 3000);
    }
  }

  /**
   * Public API for other scripts
   */
  window.adminAuth = {
    /**
     * Check if user is currently authenticated
     */
    isAuthenticated: async function () {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          credentials: "include",
        });
        const data = await response.json();
        return response.ok && data.valid;
      } catch (error) {
        console.error("Auth check error:", error);
        return false;
      }
    },

    logout: handleLogout,

    /**
     * Get current session info
     */
    getSessionInfo: async function () {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          credentials: "include",
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error("Session info error:", error);
      }
      return null;
    },
  };

  // CSS for animations (same as before)
  if (!document.querySelector("#admin-auth-styles")) {
    const style = document.createElement("style");
    style.id = "admin-auth-styles";
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
});
