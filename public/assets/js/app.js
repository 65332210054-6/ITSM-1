// Common app logic
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const path = window.location.pathname;

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

    // Initialize Shared Sidebar
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        ui.renderSidebar('sidebar-container');
    } else {
        // Fallback for pages that haven't updated yet or hardcoded
        ui.initSidebar();
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
    },
    confirm: async (title, text) => {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#f1f5f9',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            heightAuto: false,
            customClass: {
                popup: 'rounded-3xl border-0 shadow-2xl',
                title: 'font-bold text-slate-800',
                htmlContainer: 'font-medium text-slate-500',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
            }
        });
        return result.isConfirmed;
    }
};

// API Helper with Caching and Performance
const apiCache = new Map();

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const cacheKey = `${url}_${JSON.stringify(options.headers || {})}`;

    // Simple GET Cache (5 seconds)
    if (options.method === 'GET' || !options.method) {
        const cached = apiCache.get(cacheKey);
        if (cached && (Date.now() - cached.time < 5000)) {
            return cached.response.clone();
        }
    } else {
        // Clear cache on mutations
        apiCache.clear();
    }

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }

        if (response.status === 403) {
            const clone = response.clone();
            const data = await clone.json().catch(() => ({}));
            notify.error(data.message || 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
            return response;
        }

        if ((options.method === 'GET' || !options.method) && response.ok) {
            apiCache.set(cacheKey, {
                response: response.clone(),
                time: Date.now()
            });
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        notify.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        throw error;
    }
}

// Global UI Helpers
const ui = {
    choicesInstances: {},

    initChoices: (container = document) => {
        if (typeof Choices === 'undefined') {
            console.warn('Choices.js not loaded yet, retrying in 200ms...');
            setTimeout(() => ui.initChoices(container), 200);
            return;
        }

        const selects = container.querySelectorAll('select');
        selects.forEach(select => {
            if (select.classList.contains('choices__input')) return;
            
            if (ui.choicesInstances[select.id]) {
                ui.choicesInstances[select.id].destroy();
            }

            const isCompact = select.id === 'itemsPerPageSelect';
            try {
                const instance = new Choices(select, {
                    searchEnabled: false,
                    itemSelectText: '',
                    shouldSort: false,
                    allowHTML: true,
                    position: isCompact ? 'top' : 'auto'
                });
                ui.choicesInstances[select.id] = instance;

                if (isCompact) {
                    const wrapper = select.closest('.choices');
                    if (wrapper) {
                        wrapper.classList.add('choices-compact-wrapper');
                    }
                }
            } catch (e) {
                console.error('Choices init error for', select.id, e);
            }
        });
    },

    renderSidebar: (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin = user.role === 'Admin';

        container.innerHTML = `
            <aside id="sidebar" class="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col h-full shadow-2xl transition-transform duration-300 z-50 -translate-x-full lg:translate-x-0 lg:static">
                <div class="h-20 flex items-center justify-between px-6 border-b border-slate-800">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-400 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">IT</div>
                        <div>
                            <span class="font-bold text-base tracking-tight block leading-tight">ITSM</span>
                            <span class="text-[10px] text-slate-400 block leading-tight font-medium">Enterprise Admin</span>
                        </div>
                    </div>
                    <button id="closeSidebar" class="lg:hidden text-slate-400 hover:text-white p-1"><i data-lucide="x" class="h-6 w-6"></i></button>
                </div>
                <nav class="flex-1 py-6 overflow-y-auto">
                    <div class="px-6 mb-4">
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">หลัก (Main)</p>
                    </div>
                    <div class="space-y-1 px-3">
                        <a href="/" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all">
                            <i data-lucide="layout-dashboard" class="mr-3 h-5 w-5"></i> หน้าแรก
                        </a>
                        ${isAdmin ? `
                        <a href="/users.html" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                            <i data-lucide="users" class="mr-3 h-5 w-5"></i> จัดการผู้ใช้งาน
                        </a>
                        ` : ''}
                        <a href="/assets.html" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                            <i data-lucide="monitor" class="mr-3 h-5 w-5"></i> จัดการทรัพย์สิน
                        </a>
                        <a href="/tickets.html" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                            <i data-lucide="ticket" class="mr-3 h-5 w-5"></i> ระบบแจ้งซ่อม
                        </a>
                        ${isAdmin ? `
                        <a href="/settings.html" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                            <i data-lucide="settings" class="mr-3 h-5 w-5"></i> ตั้งค่าระบบ
                        </a>
                        ` : ''}
                    </div>
                </nav>
            </aside>
        `;

        if (window.lucide) lucide.createIcons();
        ui.initSidebar();
    },

    initSidebar: () => {
        const openSidebar = document.getElementById('openSidebar');
        const closeSidebar = document.getElementById('closeSidebar');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (!sidebar || !sidebarOverlay) return;

        const toggleSidebar = () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
            if (!sidebarOverlay.classList.contains('hidden')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        };

        if (openSidebar) openSidebar.addEventListener('click', toggleSidebar);
        if (closeSidebar) closeSidebar.addEventListener('click', toggleSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

        const path = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === path || (path === '/' && href === '/index.html') || (path.endsWith(href) && href !== '/')) {
                link.classList.add('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-600/20');
                link.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
                const icon = link.querySelector('i');
                if (icon) icon.classList.remove('text-slate-400');
            } else {
                link.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-600/20');
                link.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
            }
        });
    },

    exportCSV: (data, filename = 'export.csv') => {
        if (!data || !data.length) return notify.error('ไม่มีข้อมูลให้ Export');
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : row[header];
                cell = String(cell).replace(/"/g, '""');
                return `"${cell}"`;
            }).join(','))
        ].join('\n');

        // Ensure .csv extension and add date for uniqueness
        const date = new Date().toISOString().split('T')[0];
        const finalFilename = filename.endsWith('.csv') ? filename : `${filename}-${date}.csv`;

        // Data URI approach (More robust for filenames on HTTP)
        const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\ufeff' + csvContent);
        
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = finalFilename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
    }
};