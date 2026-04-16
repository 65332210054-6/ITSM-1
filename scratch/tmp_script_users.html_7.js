// UI Elements
        const editModal = document.getElementById('editModal');
        const editForm = document.getElementById('editForm');
        const addModal = document.getElementById('addModal');
        const addManualForm = document.getElementById('addManualForm');
        const addImportSection = document.getElementById('addImportSection');
        const tabManual = document.getElementById('tabManual');
        const tabImport = document.getElementById('tabImport');

        // State
        let rolesList = [];
        let branchesList = [];
        let deptsList = [];
        let importedData = [];
        let optionsLoaded = false;

        // Pagination/Data state
        let allUsers = [];
        let filteredUsers = [];
        let choicesInstances = {};
        let systemSettings = { show_user_roles: true, show_user_filter: true };

        // Pagination state
        let currentPage = 1;
        let itemsPerPage = 10;

        // State for server-side pagination
        let totalItemsCount = 0;
        let totalPagesCount = 1;
        let searchDebounceTimer = null;

        async function loadInitialData() {
            ui.initChoices();
            
            // Load settings first (Safe optimistic fallback)
            try {
                const settings = await ui.getSystemSettings();
                systemSettings = { ...systemSettings, ...settings };
            } catch (err) {
                console.error("Failed to load settings:", err);
            }

            // Apply settings visibility
            if (systemSettings.show_user_filter === false) {
                document.getElementById('filterBarContainer')?.classList.add('hidden');
            } else {
                document.getElementById('filterBarContainer')?.classList.remove('hidden');
            }
            
            // Initial load
            await loadUsers();
            
            // Load options in background to populate filters
            loadOptions();
        }

        // Debounce helper
        function debounce(func, delay) {
            return function(...args) {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => func.apply(this, args), delay);
            };
        }

        // Password Toggle Logic for Add User
        const toggleAddPassword = document.getElementById('toggleAddPassword');
        const addPasswordInput = document.getElementById('addPassword');
        const addEyeIcon = document.getElementById('addEyeIcon');

        if (toggleAddPassword) {
            toggleAddPassword.addEventListener('click', () => {
                const type = addPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                addPasswordInput.setAttribute('type', type);
                addEyeIcon.setAttribute('data-lucide', type === 'text' ? 'eye-off' : 'eye');
                lucide.createIcons();
            });
        }

        // Options Loading
        async function loadOptions() {
            if (optionsLoaded) return;
            try {
                const response = await apiFetch('/api/users?action=getOptions');
                const { roles, branches, departments } = await response.json();
                rolesList = roles;
                branchesList = branches;
                deptsList = departments;
                
                const roleSelects = [document.getElementById('editRole'), document.getElementById('addRole'), document.getElementById('filterRole')];
                const branchSelects = [document.getElementById('editBranch'), document.getElementById('addBranch'), document.getElementById('filterBranch')];
                const deptSelects = [document.getElementById('editDept'), document.getElementById('addDept'), document.getElementById('filterDept')];
                
                const roleOptions = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
                const branchOptions = '<option value="">ไม่มีสาขา</option>' + 
                    branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                const deptOptions = '<option value="">ไม่มีแผนก</option>' + 
                    departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

                const filterRoleOptions = '<option value="">ทั้งหมด (All Roles)</option>' + roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
                const filterBranchOptions = '<option value="">ทั้งหมด (All Branches)</option>' + branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                const filterDeptOptions = '<option value="">ทั้งหมด (All Departments)</option>' + departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                
                [...roleSelects, ...branchSelects, ...deptSelects].forEach(s => {
                    if (ui.choicesInstances[s.id]) {
                        ui.choicesInstances[s.id].destroy();
                        delete ui.choicesInstances[s.id];
                    }
                });

                roleSelects.forEach(s => s.innerHTML = (s.id === 'filterRole' ? filterRoleOptions : roleOptions));
                branchSelects.forEach(s => s.innerHTML = (s.id === 'filterBranch' ? filterBranchOptions : branchOptions));
                deptSelects.forEach(s => s.innerHTML = (s.id === 'filterDept' ? filterDeptOptions : deptOptions));
                
                ui.initChoices();

                // Add cascade event listeners to choices instances
                ['add', 'edit', 'filter'].forEach(mode => {
                    if (ui.choicesInstances[`${mode}Branch`]) {
                        ui.choicesInstances[`${mode}Branch`].passedElement.element.addEventListener('change', () => {
                            cascadeDepartments(mode);
                        });
                    }
                });

                // Attach filter logic to dropdowns
                ['filterRole', 'filterBranch', 'filterDept', 'filterStatus'].forEach(id => {
                    if (ui.choicesInstances[id]) {
                        ui.choicesInstances[id].passedElement.element.addEventListener('change', applyFilters);
                    }
                });

                optionsLoaded = true;
            } catch (err) {
                console.error('Failed to load options:', err);
            }
        }

        function cascadeDepartments(mode, branchIdOverride = null) {
            const branchId = branchIdOverride !== null ? branchIdOverride : document.getElementById(`${mode}Branch`).value;
            const deptEl = document.getElementById(`${mode}Dept`);
            const currentVal = deptEl.value;
            const filteredDepts = deptsList.filter(d => !branchId || d.branch_id === branchId);
            const prefix = mode === 'filter' ? 'ทั้งหมด (All Departments)' : 'ไม่มีแผนก';

            // Check if current value is still valid in filtered list
            const stillValid = filteredDepts.some(d => d.id === currentVal);
            
            // Build native options
            let html = `<option value="" ${!stillValid ? 'selected' : ''}>${prefix}</option>`;
            html += filteredDepts.map(d => `
                <option value="${d.id}" ${stillValid && d.id === currentVal ? 'selected' : ''}>${d.name}</option>
            `).join('');
            
            // Update native select and re-init Choices.js
            deptEl.innerHTML = html;
            ui.initChoices(deptEl);

            // Trigger filter if we are in filter mode and selection changed
            if (mode === 'filter' && !stillValid && currentVal !== '') {
                applyFilters();
            }
        }

        // Add Modal Functions
        async function openAddModal() {
            await loadOptions();
            addModal.classList.remove('hidden');
            
            // Reset Choices values
            Object.values(ui.choicesInstances).forEach(instance => instance.setChoiceByValue(''));
            
            lucide.createIcons();
        }

        function closeAddModal() {
            addModal.classList.add('hidden');
            addManualForm.reset();
            resetImport();
        }

        function switchAddTab(tab) {
            if (tab === 'manual') {
                addManualForm.classList.remove('hidden');
                addImportSection.classList.add('hidden');
                tabManual.classList.add('text-indigo-600', 'border-indigo-600');
                tabManual.classList.remove('text-slate-400', 'border-transparent');
                tabImport.classList.add('text-slate-400', 'border-transparent');
                tabImport.classList.remove('text-indigo-600', 'border-indigo-600');
            } else {
                addManualForm.classList.add('hidden');
                addImportSection.classList.remove('hidden');
                tabImport.classList.add('text-indigo-600', 'border-indigo-600');
                tabImport.classList.remove('text-slate-400', 'border-transparent');
                tabManual.classList.add('text-slate-400', 'border-transparent');
                tabManual.classList.remove('text-indigo-600', 'border-indigo-600');
            }
            lucide.createIcons();
        }

        // Manual Add User
        addManualForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('addName').value;
            const email = document.getElementById('addEmail').value;
            const role_id = document.getElementById('addRole').value;
            const branch_id = document.getElementById('addBranch').value || null;
            const department_id = document.getElementById('addDept').value || null;
            const password = document.getElementById('addPassword').value;

            try {
                const response = await apiFetch('/api/users?action=create', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, role_id, branch_id, department_id, password })
                });

                if (response.ok) {
                    notify.success('เพิ่มผู้ใช้งานสำเร็จ!');
                    closeAddModal();
                    loadUsers();
                } else {
                    const err = await response.json();
                    notify.error(err.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
        });

        // Import Functions
        function downloadCSVTemplate() {
            const csvContent = "name,email,role,branch,department,password\nJohn Doe,john.d,User,สำนักงานใหญ่,IT,password123\nJane Smith,jane.s,Technician,,Support,tech@123";
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "user_import_template.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        document.getElementById('csvFileInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    importedData = results.data;
                    showImportPreview();
                },
                error: function(err) {
                    notify.error('ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message);
                }
            });
        });

        function showImportPreview() {
            const preview = document.getElementById('importPreview');
            const previewBody = document.getElementById('importPreviewBody');
            const count = document.getElementById('importCount');
            
            preview.classList.remove('hidden');
            count.innerText = importedData.length;
            
            previewBody.innerHTML = importedData.map(row => `
                <tr>
                    <td class="px-3 py-2 font-medium text-slate-700">${escapeHTML(row.name || '-')}</td>
                    <td class="px-3 py-2 text-slate-500">${escapeHTML(row.email || '-')}</td>
                    <td class="px-3 py-2">
                        <span class="text-emerald-500 font-bold">พร้อมนำเข้า</span>
                    </td>
                </tr>
            `).join('');
        }

        function resetImport() {
            importedData = [];
            document.getElementById('csvFileInput').value = '';
            document.getElementById('importPreview').classList.add('hidden');
        }

        async function processBulkImport() {
            const btn = document.getElementById('confirmImportBtn');
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> กำลังนำเข้า...';
            lucide.createIcons();

            try {
                const response = await apiFetch('/api/users?action=bulkCreate', {
                    method: 'POST',
                    body: JSON.stringify(importedData)
                });

                if (response.ok) {
                    const result = await response.json();
                    notify.success(`นำเข้าสำเร็จ ${result.count} รายการ!`);
                    closeAddModal();
                    loadUsers();
                } else {
                    const err = await response.json();
                    notify.error(err.message || 'เกิดข้อผิดพลาดในการนำเข้า');
                }
            } catch (err) {
                notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            } finally {
                btn.disabled = false;
                btn.innerText = 'ยืนยันการนำเข้า';
                lucide.createIcons();
            }
        }

        // Edit Modal Functions
        async function openEditModal(id, name, email, roleId, branchId, deptId, statusVal) {
            await loadOptions();
            document.getElementById('editUserId').value = id;
            document.getElementById('editName').value = name;
            document.getElementById('editEmail').value = email;
            
            if (ui.choicesInstances['editStatus']) {
                ui.choicesInstances['editStatus'].setChoiceByValue(statusVal || 'active');
            } else {
                document.getElementById('editStatus').value = statusVal || 'active';
            }
            
            // Set Choices values
            if (ui.choicesInstances['editRole']) ui.choicesInstances['editRole'].setChoiceByValue(roleId);
            if (ui.choicesInstances['editBranch']) ui.choicesInstances['editBranch'].setChoiceByValue(branchId || '');
            
            // Cascade and set dept
            cascadeDepartments('edit', branchId || '');
            if (ui.choicesInstances['editDept']) ui.choicesInstances['editDept'].setChoiceByValue(deptId || '');
            
            editModal.classList.remove('hidden');
            lucide.createIcons();
        }

        function closeEditModal() {
            editModal.classList.add('hidden');
        }

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editUserId').value;
            const name = document.getElementById('editName').value;
            const email = document.getElementById('editEmail').value;
            const role_id = document.getElementById('editRole').value;
            const branch_id = document.getElementById('editBranch').value || null;
            const department_id = document.getElementById('editDept').value || null;
            const status = document.getElementById('editStatus').value;

            try {
                const response = await apiFetch('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({ id, name, email, role_id, branch_id, department_id, status })
                });

                if (response.ok) {
                    notify.success('แก้ไขข้อมูลสำเร็จ!');
                    closeEditModal();
                    loadUsers();
                } else {
                    const err = await response.json();
                    notify.error(err.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
        });

        // Data Loading
        async function loadUsers() {
            const tableBody = document.getElementById('userTableBody');
            if (!tableBody) return;

            // Show loading state
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-10 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center gap-3">
                            <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p class="font-medium">กำลังโหลดข้อมูล...</p>
                        </div>
                    </td>
                </tr>
            `;

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = user.role === 'Admin';
            const searchTerm = document.getElementById('userSearch')?.value || '';
            const roleId = document.getElementById('filterRole')?.value || '';
            const branchId = document.getElementById('filterBranch')?.value || '';
            const deptId = document.getElementById('filterDept')?.value || '';
            const status = document.getElementById('filterStatus')?.value || '';

            // Setup timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            try {
                const start = (currentPage - 1) * itemsPerPage + 1;
                const end = currentPage * itemsPerPage;
                const params = new URLSearchParams({
                    start: start,
                    end: end,
                    search: searchTerm,
                    role_id: roleId,
                    branch_id: branchId,
                    department_id: deptId,
                    status: status,
                    get_stats: systemSettings.show_user_roles !== false
                });

                const response = await apiFetch(`/api/users?${params.toString()}`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response || !response.ok) {
                    throw new Error(response ? `Server Error (${response.status})` : 'Network Error');
                }
                
                const data = await response.json();
                if (!data || !Array.isArray(data.users)) throw new Error('Invalid data format');

                allUsers = data.users;
                filteredUsers = allUsers; 
                totalItemsCount = data.totalCount || 0;
                totalPagesCount = data.totalPages || 1;

                renderUsers();
                if (data.roleStats) updateRoleStats(data.roleStats);
            } catch (err) {
                clearTimeout(timeoutId);
                console.error("Load users failed:", err);
                
                const isTimeout = err.name === 'AbortError';
                const errorMsg = isTimeout ? 'การเชื่อมต่อใช้เวลานานเกินไป' : err.message;

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-6 py-12 text-center">
                            <div class="flex flex-col items-center justify-center gap-4">
                                <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                                    <i data-lucide="alert-circle" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-800">เกิดข้อผิดพลาด</p>
                                    <p class="text-sm text-slate-500 mt-1">${errorMsg}</p>
                                </div>
                                <button onclick="loadUsers()" class="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                                    ลองใหม่อีกครั้ง
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                if (window.lucide) lucide.createIcons();
            }
        }

        function applyFilters() {
            // Note: Search is now handled server-side via loadUsers() with debounce
            // We'll call loadUsers from scratch when filters change
            currentPage = 1;
            loadUsers();
        }

        function renderUsers() {
            const tableBody = document.getElementById('userTableBody');
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = currentUser.role === 'Admin';

            if (filteredUsers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</td></tr>';
                return;
            }

            const pagedUsers = filteredUsers; // Data is already paged from server

            tableBody.innerHTML = pagedUsers.map(user => {
                const actionButtons = !isAdmin ? 
                    `<span class="text-slate-300 cursor-not-allowed" title="สิทธิ์การใช้งานของคุณไม่สามารถแก้ไขข้อมูลได้"><i data-lucide="lock" class="w-4 h-4 ml-auto"></i></span>` :
                    `<div class="flex justify-end gap-1">
                        <button onclick="openEditModal('${user.id}', '${escapeHTML(user.name)}', '${escapeHTML(user.email)}', '${user.role_id}', '${user.branch_id || ''}', '${user.department_id || ''}', '${user.status || 'active'}')" class="text-slate-400 hover:text-indigo-600 transition-all p-2 hover:bg-indigo-50 rounded-xl active:scale-95" title="แก้ไข">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteUser('${user.id}')" class="text-slate-400 hover:text-red-600 transition-all p-2 hover:bg-red-50 rounded-xl active:scale-95" title="ลบ">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>`;

                return `
                <tr class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                ${escapeHTML((user.name || '?').charAt(0))}
                            </div>
                            <span class="text-sm font-semibold text-slate-700">${escapeHTML(user.name || '-')}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-500">${escapeHTML(user.email)}</td>
                    <td class="px-6 py-4 text-sm text-slate-600 font-medium">${escapeHTML(user.role_name || 'User')}</td>
                    <td class="px-6 py-4 text-sm text-slate-500">${escapeHTML(user.branch_name || '-')}</td>
                    <td class="px-6 py-4 text-sm text-slate-500">${escapeHTML(user.department_name || '-')}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="${ui.getBadgeClass('status', user.status || 'active')}">
                            ${user.status === 'suspended' ? 'หยุดชั่วคราว' : (user.status === 'inactive' ? 'ระงับการใช้งาน' : 'ใช้งานปกติ')}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        ${actionButtons}
                    </td>
                </tr>
            `;
            }).join('');
            lucide.createIcons();
            ui.renderPagination('pageNumbers', currentPage, totalPagesCount, totalItemsCount, itemsPerPage);
        }

        function updateRoleStats(stats = null) {
            const container = document.getElementById('roleSummaryContainer');
            if (!container) return;
            
            // Respect the setting
            if (systemSettings.show_user_roles === false) {
                container.classList.add('hidden');
                return;
            }
            
            if (!stats || Object.keys(stats).length === 0) {
                // Only hide if we explicitly have empty stats but should be showing
                container.classList.add('hidden');
                return;
            }
            
            container.classList.remove('hidden');
            let html = '';
            const sortedRoles = Object.keys(stats).sort();
            
            sortedRoles.forEach(role => {
                // Case-insensitive mapping for safety
                const normalizedRole = role.toLowerCase();
                const roleIcons = {
                    'admin': { icon: 'shield-check', color: 'indigo' },
                    'administrator': { icon: 'shield-check', color: 'indigo' },
                    'team lead': { icon: 'users', color: 'blue' },
                    'member': { icon: 'user', color: 'slate' },
                    'user': { icon: 'user', color: 'slate' },
                    'technician': { icon: 'tool', color: 'amber' }
                };
                
                const roleConfig = roleIcons[normalizedRole] || { icon: 'shield', color: 'slate' };
                html += `
                    <div class="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md hover:border-${roleConfig.color}-200 group">
                        <div>
                            <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${escapeHTML(role)}</p>
                            <p class="text-2xl font-bold text-slate-800">${stats[role]}</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-${roleConfig.color}-50 text-${roleConfig.color}-400 flex items-center justify-center group-hover:bg-${roleConfig.color}-100 group-hover:text-${roleConfig.color}-600 transition-colors">
                            <i data-lucide="${roleConfig.icon}" class="w-5 h-5"></i>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            lucide.createIcons();
        }
        
        function goToPage(page) {
            if (page < 1 || page > totalPagesCount) return;
            currentPage = page;
            loadUsers();
        }

        document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
        document.getElementById('nextPage').addEventListener('click', () => goToPage(currentPage + 1));

        document.getElementById('itemsPerPageSelect').addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            loadUsers();
        });

        // Search Logic with 1s Debounce
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', debounce(() => {
                applyFilters();
            }, 1000));
        }

        async function deleteUser(id) {
            if (await notify.confirm('ยืนยันการลบ', 'คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
                try {
                    const response = await apiFetch(`/api/users?action=delete&id=${id}`, {
                        method: 'POST'
                    });

                    if (response.ok) {
                        notify.success('ลบข้อมูลผู้ใช้งานสำเร็จ');
                        loadUsers();
                    } else {
                        const err = await response.json();
                        notify.error(err.message || 'เกิดข้อผิดพลาดในการลบ');
                    }
                } catch (err) {
                    notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            loadInitialData();
            loadOptions();

            // Export Users (Server-side)
            document.getElementById('exportUsersBtn')?.addEventListener('click', () => {
                const token = localStorage.getItem('token');
                if (!token) return notify.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                
                // Native browser download via direct URL
                window.location.href = `/api/users?action=export&token=${token}`;
                notify.success('กำลังดาวน์โหลดข้อมูล...');
            });
        });