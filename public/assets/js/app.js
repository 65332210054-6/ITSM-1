// Common app logic
document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html');

    // Authentication Guard
    if (!token && !isLoginPage) {
        window.location.href = '/login.html';
        return;
    }

    // Redirect to home if already logged in and visiting login page
    if (token && isLoginPage) {
        window.location.href = '/';
        return;
    }

    // Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Update User UI
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const welcomeNameEl = document.getElementById('welcomeName');

    if (userNameEl) userNameEl.innerText = user.name || 'Unknown User';
    if (welcomeNameEl) welcomeNameEl.innerText = user.name || '...';
    if (userAvatarEl) userAvatarEl.innerText = (user.name || 'U').charAt(0).toUpperCase();

    // Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    }

    // Current Time
    const currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        currentTimeEl.innerText = `${d}/${m}/${y}`;
    }
});

// Security: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// API Helper
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}