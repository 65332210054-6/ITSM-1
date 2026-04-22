/**
 * IT Management System - Core Client Application
 */

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
let _isRedirecting = false;
let _pendingSettingsFetch = null;

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const cacheKey = `${url}_${JSON.stringify(options.headers || {})}`;

    if (options.method === 'GET' || !options.method) {
        const cached = apiCache.get(cacheKey);
        if (cached && (Date.now() - cached.time < 5000)) {
            return cached.response.clone();
        }
    } else {
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
            const currentPath = window.location.pathname.replace(/\/$/, '').replace(/\.html$/, '') || '/';
            if (!_isRedirecting && currentPath !== '/login') {
                _isRedirecting = true;
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('system_settings');
                localStorage.removeItem('system_settings_time');
                window.location.href = '/login.html';
            }
            return;
        }

        if (response.status === 403) {
            if (!options.silent) {
                const clone = response.clone();
                const data = await clone.json().catch(() => ({}));
                notify.error(data.message || 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
            }
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
        if (!options.silent) notify.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        return null;
    }
}

// Global UI Helpers
const ui = {
    choicesInstances: {},
    systemSettingsCache: null,
    
    // Central Module Registry
    modules: [
        { id: 'users', name: 'จัดการผู้ใช้งาน', icon: 'users', color: 'text-indigo-600', key: 'module_users_enabled', path: '/users.html', desc: 'จัดการข้อมูลพนักงานและสิทธิ์การใช้งาน' },
        { id: 'assets', name: 'จัดการทรัพย์สิน', icon: 'monitor', color: 'text-blue-600', key: 'module_assets_enabled', path: '/assets.html', desc: 'ดูแลรักษาคอมพิวเตอร์และอุปกรณ์ไอที' },
        { id: 'ipam', name: 'จัดการ IP Address', icon: 'network', color: 'text-cyan-600', key: 'module_ipam_enabled', path: '/ipam.html', desc: 'จัดการและติดตามการใช้งาน IP Address ในองค์กร' },
        { id: 'tickets', name: 'ระบบแจ้งซ่อม', icon: 'ticket', color: 'text-amber-600', key: 'module_tickets_enabled', path: '/tickets.html', desc: 'ติดตามงานซ่อมและบริการด้านไอทีทั้งหมด' },
        { id: 'borrows', name: 'ยืม-คืนอุปกรณ์', icon: 'arrow-right-from-line', color: 'text-violet-600', key: 'module_borrows_enabled', path: '/borrows.html', desc: 'บันทึกการเบิกยืมและคืนอุปกรณ์ไอที' },
        { id: 'domains', name: 'โดเมน & SSL', icon: 'globe', color: 'text-sky-600', key: 'module_domains_enabled', path: '/domains.html', desc: 'จัดการโดเมนเนม ใบรับรอง SSL และโฮสติ้ง' },
        { id: 'consumables', name: 'วัสดุสิ้นเปลือง', icon: 'package', color: 'text-rose-600', key: 'module_consumables_enabled', path: '/consumables.html', desc: 'คลังพัสดุไอทีและวัสดุสิ้นเปลือง' },
        { id: 'licenses', name: 'ลิขสิทธิ์ซอฟต์แวร์', icon: 'key', color: 'text-purple-600', key: 'module_licenses_enabled', path: '/licenses.html', desc: 'จัดการคีย์และวันหมดอายุของซอฟต์แวร์' },
        { id: 'reports', name: 'รายงาน & Export', icon: 'bar-chart-2', color: 'text-emerald-600', key: 'module_reports_enabled', path: '/reports.html', desc: 'สรุปข้อมูลทางสถิติและส่งออกไฟล์ CSV' },
        { id: 'categories', name: 'หมวดหมู่ทรัพย์สิน', icon: 'layers', color: 'text-rose-600', key: 'module_categories_enabled', path: '/categories.html', desc: 'จัดการประเภทและหมวดหมู่ของอุปกรณ์' }
    ],

    verifySession: async () => {
        try {
            const res = await apiFetch('/api/profile', { method: 'GET', silent: true });
            if (res && res.ok) {
                const data = await res.json();
                const localUser = JSON.parse(localStorage.getItem('user') || '{}');

                // Robust check for any changes in the user record
                const dataStr = JSON.stringify(data.user);
                const localStr = JSON.stringify({
                    id: localUser.id,
                    name: localUser.name,
                    email: localUser.email,
                    role: localUser.role,
                    avatar_url: localUser.avatar_url,
                    phone: localUser.phone,
                    branch_name: localUser.branch_name,
                    department_name: localUser.department_name
                });

                if (data.user && dataStr !== localStr) {
                    const newUser = { ...localUser, ...data.user };
                    localStorage.setItem('user', JSON.stringify(newUser));

                    // Trigger UI updates immediately
                    const pageTitle = document.title.split('|')[0].trim();
                    ui.renderHeader(pageTitle, window.location.pathname.includes('-detail'));

                    const settings = await ui.getSystemSettings();
                    if (document.getElementById('sidebar-container')) {
                        ui.renderSidebar('sidebar-container', settings);
                    }

                    // Handle Access Control Redirects if role changed
                    if (data.user.role !== localUser.role) {
                        const path = window.location.pathname;
                        const normPath = path.replace(/\/$/, '').replace(/\.html$/, '') || '/';

                        let moduleKey = '';
                        if (normPath === '/users') moduleKey = 'module_users_enabled';
                        if (normPath === '/assets' || normPath === '/asset-detail') moduleKey = 'module_assets_enabled';
                        if (normPath === '/tickets' || normPath === '/ticket-detail') moduleKey = 'module_tickets_enabled';

                        if (moduleKey && !ui.checkAccess(moduleKey, settings, data.user, 'view')) {
                            if (!_isRedirecting) {
                                _isRedirecting = true;
                                window.location.replace('/index.html');
                            }
                        }
                    }
                }
                return data;
            }
        } catch (e) { console.error('Session verification failed', e); }
        return null;
    },

    getSystemSettings: async (forceRefresh = false) => {
        const localCache = localStorage.getItem('system_settings');
        const cacheTimestamp = parseInt(localStorage.getItem('system_settings_time') || '0', 10);
        const cacheAge = Date.now() - cacheTimestamp;
        const CACHE_TTL = 2 * 60 * 1000;

        if (localCache && !forceRefresh) {
            const settings = JSON.parse(localCache);
            if (cacheAge > CACHE_TTL) ui.getSystemSettings(true).catch(() => { });
            return settings;
        }

        if (_pendingSettingsFetch && !forceRefresh) return _pendingSettingsFetch;

        _pendingSettingsFetch = (async () => {
            try {
                const response = await fetch('/api/system-settings', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.ok) {
                    const settings = await response.json();
                    ui.systemSettingsCache = settings;
                    localStorage.setItem('system_settings', JSON.stringify(settings));
                    localStorage.setItem('system_settings_time', Date.now().toString());
                    return settings;
                }
            } catch (e) {
                console.error("Settings fetch failed", e);
            } finally {
                _pendingSettingsFetch = null;
            }
            return ui.systemSettingsCache || (localCache ? JSON.parse(localCache) : {});
        })();
        return _pendingSettingsFetch;
    },

    initCrossTabSync: () => {
        window.addEventListener('storage', (e) => {
            if (e.key === 'system_settings') {
                const settings = JSON.parse(e.newValue || '{}');
                ui.systemSettingsCache = settings;
                ui.renderSidebar('sidebar-container', settings);
            }
        });
    },

    initChoices: (target = document) => {
        if (typeof Choices === 'undefined') {
            setTimeout(() => ui.initChoices(target), 200);
            return;
        }
        const selects = (target instanceof HTMLElement) ? [target] : target.querySelectorAll('select');
        selects.forEach(select => {
            if (select.classList.contains('choices__input')) return;
            if (ui.choicesInstances[select.id]) ui.choicesInstances[select.id].destroy();
            try {
                const instance = new Choices(select, {
                    searchEnabled: select.dataset.search === 'true',
                    searchPlaceholderValue: select.dataset.searchPlaceholder || 'ค้นหา...',
                    itemSelectText: '',
                    shouldSort: false,
                    allowHTML: true,
                    fuseOptions: {
                        threshold: 0.1, // Stricter search but allows substrings (0.0 was too strict)
                        distance: 100
                    },
                    searchResultLimit: 100, // Show more results (default is often 4)
                    position: select.id === 'itemsPerPageSelect' ? 'top' : 'auto',
                    placeholder: true,
                    placeholderValue: select.getAttribute('placeholder') || null
                });
                ui.choicesInstances[select.id] = instance;
            } catch (e) { }
        });
    },

    checkAccess: (moduleKey, settings, user, action = 'view') => {
        const u = user || JSON.parse(localStorage.getItem('user') || '{}');
        const s = settings || JSON.parse(localStorage.getItem('system_settings') || '{}');
        if (u.role === 'Admin') return true;

        // Handle legacy keys if passed directly
        let baseKey = moduleKey;
        if (moduleKey.startsWith('module_') && moduleKey.endsWith('_enabled')) {
            baseKey = moduleKey.replace('module_', '').replace('_enabled', '');
        }

        const permKey = `module_${baseKey}_roles_${action}`;
        const legacyKey = `module_${baseKey}_enabled`;
        
        let val = s[permKey];

        // Only fallback to legacy view setting if action is 'view'
        if (val === undefined && action === 'view') {
            val = s[legacyKey];
        }

        // Default: If explicitly true/false, respect it. If undefined, true for view, false for others.
        if (val === true || val === 'true') return true;
        if (val === false || val === 'false') return false;
        if (val === null || val === undefined) {
            return action === 'view';
        }

        const allowedRoles = String(val).split(',').map(r => r.trim());
        return allowedRoles.includes(u.role);
    },

    renderTableLoading: (tableBodyId, colspan, message = 'กำลังโหลดข้อมูล...') => {
        const tbody = document.getElementById(tableBodyId);
        if (!tbody) return;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="px-6 py-10 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center gap-3">
                        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="font-medium">${escapeHTML(message)}</p>
                    </div>
                </td>
            </tr>
        `;
    },

    renderHeader: (title, showBack = false, breadcrumb = null) => {
        const container = document.getElementById('header-container');
        if (!container) return;

        // Auto-detect breadcrumb if not provided and it's a detail page
        let activeBreadcrumb = breadcrumb;
        if (!activeBreadcrumb && showBack) {
            if (window.location.pathname.includes('ticket-detail')) {
                activeBreadcrumb = { parent: 'ระบบแจ้งซ่อม', url: '/tickets.html' };
            } else if (window.location.pathname.includes('asset-detail')) {
                activeBreadcrumb = { parent: 'จัดการทรัพย์สิน', url: '/assets.html' };
            }
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const avatarInitial = (user.name || '?').charAt(0).toUpperCase();

        const backButton = showBack ? `
            <button onclick="window.history.back()" class="text-slate-500 hover:text-indigo-600 p-2 rounded-xl hover:bg-slate-50 transition-all">
                <i data-lucide="arrow-left" class="h-6 w-6"></i>
            </button>
        ` : `
            <button id="openSidebar" class="lg:hidden text-slate-500 hover:text-indigo-600 p-2 rounded-xl hover:bg-slate-50 transition-all">
                <i data-lucide="menu" class="h-6 w-6"></i>
            </button>
        `;

        let headerTitle = `<h1 class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">${title}</h1>`;
        if (activeBreadcrumb) {
            headerTitle = `
                <div class="flex items-center gap-2 text-base sm:text-xl overflow-hidden">
                    <a href="${activeBreadcrumb.url}" class="font-bold text-slate-400 hover:text-indigo-600 transition-colors whitespace-nowrap">${activeBreadcrumb.parent}</a>
                    <span class="text-slate-300">/</span>
                    <h1 class="font-black text-slate-800 tracking-tight truncate">${title}</h1>
                </div>
            `;
        }

        container.innerHTML = `
            <header class="page-header">
                <div class="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    ${backButton}
                    ${headerTitle}
                </div>
                <div class="flex items-center gap-2 sm:gap-6 ml-4">
                        <button onclick="window.location.href='/profile.html'" class="flex items-center gap-3 p-1 sm:p-2 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group border border-transparent hover:border-slate-200 cursor-pointer">
                            <div class="text-right hidden md:block">
                                <p id="userName" class="text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">${escapeHTML(user.name || 'User')}</p>
                                <p id="userRole" class="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-tight">${user.role || 'System Admin'}</p>
                                <p id="currentTime" class="text-[10px] font-semibold text-slate-500 mt-0.5">${new Date().toLocaleDateString('th-TH')}</p>
                            </div>
                            <div id="userAvatar" class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/20 overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-100 transition-all">
                                ${user.avatar_url ? `<img src="${user.avatar_url}" class="w-full h-full object-cover">` : avatarInitial}
                            </div>
                        </button>
                        <button id="logoutBtn" class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group cursor-pointer">
                            <i data-lucide="log-out" class="h-5 w-5 group-hover:translate-x-0.5 transition-transform"></i>
                        </button>
                    </div>
            </header>
        `;

        // Re-initialize sidebar toggle because we just replaced the button
        ui.initSidebar();

        // Re-attach logout listener
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('system_settings');
                localStorage.removeItem('system_settings_time');
                window.location.href = '/login.html';
            };
        }

        try { if (window.lucide) lucide.createIcons(); } catch (e) { }
    },

    getBadgeClass: (type, value) => {
        const val = String(value).toLowerCase();
        if (type === 'status') {
            if (['active', 'in use', 'resolved', 'closed', 'success'].includes(val)) return 'status-badge status-success';
            if (['inactive', 'broken', 'repairing', 'danger'].includes(val)) return 'status-badge status-danger';
            if (['suspended', 'on hold', 'warning', 'in progress'].includes(val)) return 'status-badge status-warning';
            return 'status-badge status-neutral';
        }
        if (type === 'priority') {
            if (['critical', 'high'].includes(val)) return 'status-badge status-danger';
            if (['medium'].includes(val)) return 'status-badge status-warning';
            return 'status-badge status-success';
        }
        return 'status-badge status-neutral';
    },

    renderPagination: (containerId, currentPage, totalPages, totalItems, itemsPerPage) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

        const startEl = document.getElementById('showingStart');
        const endEl = document.getElementById('showingEnd');
        const totalEl = document.getElementById('totalItems');
        if (startEl) startEl.innerText = startIndex;
        if (endEl) endEl.innerText = endIndex;
        if (totalEl) totalEl.innerText = totalItems;

        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageNums = document.getElementById('pageNumbers');

        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;

        if (pageNums) {
            let html = '';
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + 4);
            if (end - start + 1 < 5) start = Math.max(1, end - 4);
            for (let i = start; i <= end; i++) {
                html += `<button onclick="goToPage(${i})" class="pagination-btn ${i === currentPage ? 'pagination-btn-active' : 'pagination-btn-inactive'}">${i}</button>`;
            }
            pageNums.innerHTML = html;
        }
    },

    renderSidebar: async (containerId, settingsFromParam = null) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const settings = settingsFromParam || await ui.getSystemSettings();
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
                </div>
                <nav class="flex-1 py-6 overflow-y-auto">
                    <div class="px-6 mb-4"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">หลัก (Main)</p></div>
                    <div class="space-y-1 px-3">
                        <a href="/" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all"><i data-lucide="layout-dashboard" class="mr-3 h-5 w-5"></i> หน้าแรก</a>
                        ${ui.modules.map(m => {
                            if (ui.checkAccess(m.id, settings, user, 'view')) {
                                return `<a href="${m.path}" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><i data-lucide="${m.icon}" class="mr-3 h-5 w-5"></i> ${m.name}</a>`;
                            }
                            return '';
                        }).join('')}
                        ${isAdmin ? `<a href="/settings.html" class="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><i data-lucide="settings" class="mr-3 h-5 w-5"></i> ตั้งค่าระบบ</a>` : ''}
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
        const toggleSidebar = () => {
            if (!sidebar) return;
            sidebar.classList.toggle('-translate-x-full');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('hidden');
        };
        if (openSidebar) openSidebar.onclick = toggleSidebar;
        if (closeSidebar) closeSidebar.onclick = toggleSidebar;

        const path = window.location.pathname;
        const normPath = path.replace(/\/$/, '').replace(/\.html$/, '') || '/';
        document.querySelectorAll('nav a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const normHref = href.replace(/\/$/, '').replace(/\.html$/, '') || '/';
            if (normPath === normHref || (normPath === '/index' && normHref === '/')) {
                link.classList.add('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-600/20');
                link.classList.remove('text-slate-400', 'hover:bg-slate-800');
            }
        });
    },

    // Standard Profile/Logout Helpers
    exportCSV: (data, filename = 'export.csv') => {
        if (!data || !data.length) return notify.error('ไม่มีข้อมูลให้ Export');
        const headers = Object.keys(data[0]);
        const csvContent = [headers.join(','), ...data.map(row => headers.map(header => {
            let cell = row[header] === null || row[header] === undefined ? '' : row[header];
            return `"${String(cell).replace(/"/g, '""')}"`;
        }).join(','))].join('\n');
        const date = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\ufeff' + csvContent);
        link.download = filename.endsWith('.csv') ? filename : `${filename}-${date}.csv`;
        link.style.display = 'none';
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
    }
};

// Application Lifecycle (Bottom)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const path = window.location.pathname;
        const normPath = path.replace(/\/$/, '').replace(/\.html$/, '') || '/';
        if (normPath === '/login') return;

        // Shared Elements
        const elements = {
            name: document.getElementById('userName'),
            welcome: document.getElementById('welcomeName'),
            role: document.getElementById('userRole'),
            avatar: document.getElementById('userAvatar'),
            time: document.getElementById('currentTime'),
            sidebar: document.getElementById('sidebar-container'),
            logout: document.getElementById('logoutBtn')
        };

        // 1. FAST OPTIMISTIC RENDER (Local Data)
        try {
            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            const localSettings = JSON.parse(localStorage.getItem('system_settings') || '{}');

            const pageTitle = document.title.split('|')[0].trim();
            if (document.getElementById('header-container')) {
                ui.renderHeader(pageTitle, window.location.pathname.includes('-detail'));
            }

            if (elements.sidebar) ui.renderSidebar('sidebar-container', localSettings);
            else ui.initSidebar();

            ui.initCrossTabSync();
        } catch (e) { console.error("Optimistic failed", e); }

        // 2. BACKGROUND VERIFICATION (Remote Data)
        const [sessionData, settings] = await Promise.all([
            ui.verifySession().catch(() => null),
            ui.getSystemSettings().catch(() => ({}))
        ]);

        const user = sessionData?.user || JSON.parse(localStorage.getItem('user') || '{}');
        const isAdmin = user.role === 'Admin';

        let moduleKey = '';
        const currentModule = ui.modules.find(m => {
            const normMPath = m.path.replace(/\.html$/, '');
            return normPath === normMPath || (m.id === 'assets' && normPath === '/asset-detail') || (m.id === 'tickets' && normPath === '/ticket-detail');
        });

        if (currentModule) moduleKey = currentModule.key;

        if (moduleKey && !ui.checkAccess(moduleKey, settings, user, 'view')) {
            window.location.replace('/index.html');
            return;
        }

        const _isAdmin = user.role === 'Admin';
        const _isStaff = user.role === 'Admin' || user.role === 'Technician';

        if ((normPath === '/settings') && !_isAdmin) {
            window.location.replace('/index.html');
            return;
        }

        // Final UI Polish (Only if data changed)
        const currentSettingsJSON = localStorage.getItem('system_settings');
        if (elements.sidebar && JSON.stringify(settings) !== currentSettingsJSON) {
            ui.renderSidebar('sidebar-container', settings);
        }

        if (elements.name) elements.name.innerText = user.name || 'User';
        if (elements.role) elements.role.innerText = user.role || 'System Admin';
        if (window.lucide) lucide.createIcons();
    } catch (err) { console.error("Global init failed:", err); }
});