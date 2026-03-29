// Common app logic
document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const path = window.location.pathname;
    const isLoginPage = path === '/login' || path === '/login.html' || path.endsWith('/login.html');

    // Authentication Guard
    if (!token && !isLoginPage) {
        window.location.href = '/login.html';
        return;
    }

    // Redirect to home if already logged in and visiting login page
    if (token && isLoginPage) {
        window.location.href = '/index.html';
        return;
    }

    // Role-based Access Control
    const isAdminOnlyPage = path.endsWith('users.html') || path.endsWith('settings.html');
    if (isAdminOnlyPage && user.role !== 'Admin') {
        window.location.href = '/index.html';
        return;
    }

    // Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Update Header Profile Info
    const userNameEl = document.getElementById('userName');
    const welcomeNameEl = document.getElementById('welcomeName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) userNameEl.innerText = user.name || 'User';
    if (welcomeNameEl) welcomeNameEl.innerText = user.name || 'User';
    if (userRoleEl) userRoleEl.innerText = user.role || 'System Admin';
    if (userAvatarEl) {
        if (user.avatar_url) {
            userAvatarEl.innerHTML = `<img src="${user.avatar_url}" class="w-full h-full rounded-xl object-cover">`;
        } else {
            userAvatarEl.innerText = (user.name || 'U').charAt(0).toUpperCase();
        }
    }

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

    // Sidebar Menu Access Control
    if (user.role !== 'Admin') {
        const adminLinks = document.querySelectorAll('a[href="/users.html"], a[href="/settings.html"]');
        adminLinks.forEach(link => {
            link.style.display = 'none';
        });
    }
});

// Security: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Notifications Helper (SweetAlert2)
const notify = {
    success: (message) => {
        Swal.fire({
            icon: 'success',
            title: 'สำเร็จ!',
            text: message,
            timer: 2000,
            showConfirmButton: false,
            heightAuto: false,
            customClass: {
                popup: 'rounded-3xl border-0 shadow-2xl',
                title: 'font-bold text-slate-800',
                htmlContainer: 'font-medium text-slate-500'
            }
        });
    },
    error: (message) => {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด!',
            text: message,
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#4f46e5',
            heightAuto: false,
            customClass: {
                popup: 'rounded-3xl border-0 shadow-2xl',
                title: 'font-bold text-slate-800',
                htmlContainer: 'font-medium text-slate-500',
                confirmButton: 'rounded-xl px-8 py-3 font-bold'
            }
        });
    },
    toast: (message, icon = 'success') => {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            heightAuto: false,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        Toast.fire({
            icon: icon,
            title: message
        });
    }
};

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