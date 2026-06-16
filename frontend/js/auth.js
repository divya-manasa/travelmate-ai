/**
 * Authentication management and page guards
 */

(function initRouteGuard() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    const authPages = ['login.html', 'register.html'];
    const protectedPages = ['dashboard.html', 'suggestions.html', 'profile.html'];

    if (!token && protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
    } else if (token && authPages.includes(currentPage)) {
        window.location.href = 'dashboard.html';
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Inject user info in navbar if logged in
    setupNavbarUser();

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Logout Trigger
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Setup dynamic Navbar content
function setupNavbarUser() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const authNav = document.getElementById('authNav');
    
    if (authNav) {
        if (token && userJson) {
            try {
                const user = JSON.parse(userJson);
                authNav.innerHTML = `
                    <span style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500;">Hello, ${user.fullName}</span>
                    <button id="logoutBtn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;">Logout</button>
                `;
                // Add event listener immediately
                document.getElementById('logoutBtn').addEventListener('click', handleLogout);
            } catch (e) {
                console.error("Error parsing stored user details", e);
            }
        } else {
            authNav.innerHTML = `
                <a href="login.html" class="nav-link">Login</a>
                <a href="register.html" class="btn btn-primary">Sign Up</a>
            `;
        }
    }
}

// Login logic
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validation
    let hasError = false;
    if (!email) {
        showFieldError('email', 'Email is required');
        hasError = true;
    } else {
        hideFieldError('email');
    }

    if (!password) {
        showFieldError('password', 'Password is required');
        hasError = true;
    } else {
        hideFieldError('password');
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true, 'Log In');

    try {
        const result = await ApiClient.login(email, password);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify({
            uid: result.uid,
            fullName: result.fullName,
            email: result.email
        }));
        
        showToast('Success', `Welcome back, ${result.fullName}!`, 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } catch (error) {
        showToast('Authentication Failed', error.message, 'error');
        setButtonLoading(submitBtn, false, 'Log In');
    }
}

// Registration logic
async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Validation
    let hasError = false;
    if (!fullName) {
        showFieldError('fullName', 'Full Name is required');
        hasError = true;
    } else {
        hideFieldError('fullName');
    }

    if (!email) {
        showFieldError('email', 'Email is required');
        hasError = true;
    } else {
        hideFieldError('email');
    }

    if (!password) {
        showFieldError('password', 'Password is required');
        hasError = true;
    } else if (password.length < 6) {
        showFieldError('password', 'Password must be at least 6 characters');
        hasError = true;
    } else {
        hideFieldError('password');
    }

    if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        hasError = true;
    } else {
        hideFieldError('confirmPassword');
    }

    if (hasError) return;

    setButtonLoading(submitBtn, true, 'Sign Up');

    try {
        await ApiClient.register(fullName, email, password);
        showToast('Account Created', 'Registration successful! Logging you in...', 'success');
        
        // Auto sign-in after register
        try {
            const loginResult = await ApiClient.login(email, password);
            localStorage.setItem('token', loginResult.token);
            localStorage.setItem('user', JSON.stringify({
                uid: loginResult.uid,
                fullName: loginResult.fullName,
                email: loginResult.email
            }));
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (loginErr) {
            // If auto login fails, redirect to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
    } catch (error) {
        showToast('Registration Failed', error.message, 'error');
        setButtonLoading(submitBtn, false, 'Sign Up');
    }
}

// Logout handler
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Success', 'Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 800);
}

// Field Error Helpers
function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (input) {
        input.style.borderColor = 'var(--danger)';
        const errorMsg = input.parentElement.querySelector('.form-error-msg');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
    }
}

function hideFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    if (input) {
        input.style.borderColor = '';
        const errorMsg = input.parentElement.querySelector('.form-error-msg');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    }
}
