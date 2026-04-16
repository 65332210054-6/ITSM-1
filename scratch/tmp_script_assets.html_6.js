// Assets Logic
        let allAssets = [];
        let filteredAssets = [];
        let allUsers = [];
        let allDepts = [];
        let choicesInstances = {};

        // Pagination & Search state
        let currentPage = 1;
        let itemsPerPage = 10;
        let totalItemsCount = 0;
        let totalPagesCount = 1;
        let searchTimer = null;

        async function loadInitialData() {
            // Initialize Choices first
            ui.initChoices();
            
            // Load main data immediately
            loadAssets();

            // Load meta data in background (silent to ignore 403 if modules are restricted)
            try {
                const results = await Promise.allSettled([
                    apiFetch('/api/users?action=getOptions', { silent: true }),
                    apiFetch('/api/departments', { silent: true })
                ]);
                
                const userRes = results[0].status === 'fulfilled' ? results[0].value : null;
                const deptRes = results[1].status === 'fulfilled' ? results[1].value : null;
 
                if (userRes && userRes.ok) {
                    allUsers = await userRes.json().catch(() => ({ roles: [], branches: [], departments: [] }));
                    const usersArray = Array.isArray(allUsers) ? allUsers : (allUsers.users || []);
                    const userSelect = document.getElementById('assetUser');
                    if (userSelect) {
                        userSelect.innerHTML = '<option value="">ไม่มี (Stock)</option>' + 
                            usersArray.map(u => `<option value="${u.id}">${escapeHTML(u.name)}</option>`).join('');
                        // Re-init Choices
                        ui.initChoices();
                    }
                }
                
                if (deptRes && deptRes.ok) {
                    allDepts = await deptRes.json().catch(() => []);
                    const deptSelect = document.getElementById('assetDept');
                    if (deptSelect) {
                        deptSelect.innerHTML = '<option value="">ไม่มีแผนก</option>' + 
                            allDepts.map(d => `<option value="${d.id}">${escapeHTML(d.name)}</option>`).join('');
                        // Re-init Choices
                        ui.initChoices();
                    }
                }
            } catch (err) {
                console.error('Failed to load background data:', err);
            }
        }

        async function loadAssets() {
            const tbody = document.getElementById('assetTableBody');
            const searchTerm = document.getElementById('assetSearch')?.value || '';
            
            try {
                const start = (currentPage - 1) * itemsPerPage + 1;
                const end = currentPage * itemsPerPage;
                const params = new URLSearchParams({
                    start: start,
                    end: end,
                    search: searchTerm
                });

                const response = await apiFetch(`/api/assets?${params.toString()}`);
                if (!response || !response.ok) {
                    const errorData = response ? await response.json().catch(() => ({})) : {};
                    throw new Error(errorData.message || `Error ${response?.status || 'Network'}`);
                }

                const data = await response.json();
                allAssets = data.assets;
                filteredAssets = data.assets; // Now everything is filtered by server
                totalItemsCount = data.totalCount;
                totalPagesCount = data.totalPages;
                
                renderAssets();
            } catch (err) {
                console.error('Load Assets Error:', err);
                tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-red-500">
                    <div class="flex flex-col items-center gap-2">
                        <i data-lucide="alert-circle" class="w-8 h-8"></i>
                        <span>เกิดข้อผิดพลาด: ${err.message}</span>
                        <button onclick="loadAssets()" class="mt-2 text-xs text-indigo-600 underline">ลองใหม่อีกครั้ง</button>
                    </div>
                </td></tr>`;
                lucide.createIcons();
            }
        }

        function renderAssets() {
            const tbody = document.getElementById('assetTableBody');
            if (filteredAssets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400">ไม่พบข้อมูลทรัพย์สิน</td></tr>';
                updatePagination();
                return;
            }

            const pagedAssets = filteredAssets; // Data is already paged from server

            // Document fragment for better performance
            const fragment = document.createDocumentFragment();
            pagedAssets.forEach(a => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                tr.innerHTML = `
                    <td class="px-6 py-4">
                        <div class="font-bold text-slate-800 text-sm">${escapeHTML(a.asset_tag)}</div>
                        <div class="text-[10px] text-slate-400 font-medium">S/N: ${escapeHTML(a.serial_number)}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-semibold text-slate-700">${escapeHTML(a.name)}</div>
                        <div class="text-[10px] text-slate-400">${escapeHTML(a.model || '')}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">${escapeHTML(a.category)}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-slate-600">${escapeHTML(a.assigned_to_name || 'Stock')}</div>
                        <div class="text-[10px] text-slate-400">${escapeHTML(a.department_name || '-')}</div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="${ui.getBadgeClass('status', a.status)}">
                            ${a.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-1">
                            <button onclick="window.location.href='/asset-detail.html?id=${a.id}'" class="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-95" title="ดูรายละเอียด">
                                <i data-lucide="search" class="w-4 h-4"></i>
                            </button>
                            <button onclick="editAsset('${a.id}')" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95" title="แก้ไข">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                `;
                fragment.appendChild(tr);
            });
            tbody.innerHTML = '';
            tbody.appendChild(fragment);
            lucide.createIcons();
            ui.renderPagination('pageNumbers', currentPage, totalPagesCount, totalItemsCount, itemsPerPage);
        }

        function goToPage(page) {
            if (page < 1 || page > totalPagesCount) return;
            currentPage = page;
            loadAssets();
        }

        document.getElementById('prevPage').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadAssets();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (currentPage < totalPagesCount) {
                currentPage++;
                loadAssets();
            }
        });

        document.getElementById('itemsPerPageSelect').addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            loadAssets();
        });

        // Modal Controls
        function openAssetModal() {
            document.getElementById('modalTitle').innerText = 'เพิ่มทรัพย์สินใหม่';
            document.getElementById('assetForm').reset();
            document.getElementById('assetId').value = '';
            
            // Reset Choices
            Object.values(ui.choicesInstances).forEach(instance => instance.setChoiceByValue(''));
            
            document.getElementById('deleteAssetBtn').classList.add('hidden');
            document.getElementById('assetModal').classList.remove('hidden');
        }

        function closeAssetModal() {
            document.getElementById('assetModal').classList.add('hidden');
        }

        async function editAsset(id) {
            const asset = allAssets.find(a => a.id === id);
            if (!asset) return;

            document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลทรัพย์สิน';
            document.getElementById('assetId').value = asset.id;
            document.getElementById('assetTag').value = asset.asset_tag;
            document.getElementById('serialNumber').value = asset.serial_number;
            document.getElementById('assetName').value = asset.name;
            document.getElementById('assetModel').value = asset.model || '';
            
            // Set Choices values
            if (ui.choicesInstances['assetCategory']) ui.choicesInstances['assetCategory'].setChoiceByValue(asset.category);
            if (ui.choicesInstances['assetStatus']) ui.choicesInstances['assetStatus'].setChoiceByValue(asset.status);
            if (ui.choicesInstances['assetUser']) ui.choicesInstances['assetUser'].setChoiceByValue(asset.assigned_to || '');
            if (ui.choicesInstances['assetDept']) ui.choicesInstances['assetDept'].setChoiceByValue(asset.department_id || '');
            
            if (asset.purchase_date) {
                document.getElementById('assetPurchaseDate').value = asset.purchase_date.split('T')[0];
            } else {
                document.getElementById('assetPurchaseDate').value = '';
            }

            document.getElementById('deleteAssetBtn').classList.remove('hidden');
            document.getElementById('assetModal').classList.remove('hidden');
        }

        async function confirmDeleteAsset() {
            const id = document.getElementById('assetId').value;
            if (!id) return;

            const confirmed = await notify.confirm('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบทรัพย์สินนี้? ข้อมูลจะไม่สามารถกู้คืนได้');
            if (confirmed) {
                try {
                    const response = await apiFetch(`/api/assets?action=delete&id=${id}`, {
                        method: 'POST'
                    });

                    if (response.ok) {
                        notify.success('ลบทรัพย์สินเรียบร้อยแล้ว');
                        closeAssetModal();
                        loadAssets();
                    } else {
                        const err = await response.json();
                        notify.error(err.message || 'เกิดข้อผิดพลาดในการลบ');
                    }
                } catch (err) {
                    notify.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
                }
            }
        }

        document.getElementById('assetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('assetId').value;
            const data = {
                id: id || null,
                asset_tag: document.getElementById('assetTag').value,
                serial_number: document.getElementById('serialNumber').value,
                name: document.getElementById('assetName').value,
                model: document.getElementById('assetModel').value,
                category: document.getElementById('assetCategory').value,
                status: document.getElementById('assetStatus').value,
                assigned_to: document.getElementById('assetUser').value || null,
                department_id: document.getElementById('assetDept').value || null,
                purchase_date: document.getElementById('assetPurchaseDate').value || null
            };

            try {
                const response = await apiFetch('/api/assets', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    notify.success(id ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มทรัพย์สินสำเร็จ');
                    closeAssetModal();
                    loadAssets();
                } else {
                    const err = await response.json();
                    notify.error(err.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                notify.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
        });

        // Search logic with 1s Debounce
        document.getElementById('assetSearch').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                currentPage = 1;
                loadAssets();
            }, 1000);
        });

        // Export Assets (Server-side)
        document.getElementById('exportAssetsBtn')?.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token) return notify.error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');

            // Native browser download via direct URL
            window.location.href = `/api/assets?action=export&token=${token}`;
            notify.success('กำลังดาวน์โหลดข้อมูล...');
        });

        document.addEventListener('DOMContentLoaded', loadInitialData);