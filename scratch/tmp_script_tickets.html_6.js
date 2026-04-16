// Tickets Logic
        let allTickets = [];
        let filteredTickets = [];
        let technicians = [];
        
        // Pagination & Search state
        let currentPage = 1;
        let itemsPerPage = 10;
        let totalItemsCount = 0;
        let totalPagesCount = 1;
        let searchTimer = null;

        async function loadInitialData() {
            // Initialize Shared UI Components
            ui.initChoices();
            
            // Load tickets immediately
            loadTickets();

            // Load meta data in background
            try {
                const userObj = JSON.parse(localStorage.getItem('user') || '{}');
                const isAdminOrTech = userObj.role === 'Admin' || userObj.role === 'Technician';

                const results = await Promise.allSettled([
                    apiFetch('/api/assets?action=getOptions', { silent: true }),
                    isAdminOrTech ? apiFetch('/api/users?action=getOptions', { silent: true }) : Promise.resolve(null)
                ]);

                const assetRes = results[0].status === 'fulfilled' ? results[0].value : null;
                const userRes = results[1].status === 'fulfilled' ? results[1].value : null;

                if (assetRes && assetRes.ok) {
                    const allAssets = await assetRes.json().catch(() => []);
                    const assetSelect = document.getElementById('ticketAsset');
                    if (assetSelect) {
                        assetSelect.innerHTML = '<option value="">ไม่ระบุทรัพย์สิน</option>' + 
                            allAssets.map(a => `<option value="${a.id}">${escapeHTML(a.asset_tag)} - ${escapeHTML(a.name)}</option>`).join('');
                        ui.initChoices();
                    }
                }

                if (userRes && userRes.ok) {
                    const responseData = await userRes.json().catch(() => []);
                    const usersArray = Array.isArray(responseData) ? responseData : (responseData.users || []);
                    technicians = usersArray.filter(u => u.role_name === 'Admin' || u.role_name === 'Technician');
                    const assigneeSelect = document.getElementById('ticketAssignee');
                    if (assigneeSelect) {
                        assigneeSelect.innerHTML = '<option value="">รอมอบหมาย</option>' + 
                            technicians.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('');
                        ui.initChoices();
                    }
                }
            } catch (err) {
                console.error('Failed to load background data:', err);
            }
        }

        async function loadTickets() {
            const tbody = document.getElementById('ticketTableBody');
            const searchTerm = document.getElementById('ticketSearch')?.value || '';

            try {
                const start = (currentPage - 1) * itemsPerPage + 1;
                const end = currentPage * itemsPerPage;
                const params = new URLSearchParams({
                    start: start,
                    end: end,
                    search: searchTerm
                });

                const response = await apiFetch(`/api/tickets?${params.toString()}`);
                if (!response || !response.ok) {
                    throw new Error('Failed to fetch tickets');
                }
                const data = await response.json();
                allTickets = data.tickets;
                filteredTickets = data.tickets;
                totalItemsCount = data.totalCount;
                totalPagesCount = data.totalPages;

                renderTickets();
            } catch (err) {
                console.error('Load Tickets Error:', err);
                tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-red-500">
                    <div class="flex flex-col items-center gap-2">
                        <i data-lucide="alert-circle" class="w-8 h-8"></i>
                        <span>เกิดข้อผิดพลาด: ${err.message}</span>
                    </div>
                </td></tr>`;
                lucide.createIcons();
            }
        }

        function renderTickets() {
            const tbody = document.getElementById('ticketTableBody');
            if (filteredTickets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400">ไม่พบรายการแจ้งซ่อม</td></tr>';
                updatePagination();
                return;
            }

            const pagedTickets = filteredTickets; // Data is already paged from server

            const fragment = document.createDocumentFragment();
            pagedTickets.forEach(t => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                tr.innerHTML = `
                    <td class="px-6 py-4">
                        <div class="font-bold text-slate-800 uppercase tracking-wider text-xs">#TK-${t.id.substring(0, 8)}</div>
                        <div class="text-[10px] text-slate-400 font-medium">${new Date(t.created_at).toLocaleDateString('th-TH')}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-semibold text-slate-700">${escapeHTML(t.subject)}</div>
                        <div class="text-[10px] text-slate-400 truncate max-w-xs">${escapeHTML(t.description || 'ไม่มีรายละเอียด')}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-slate-600">${escapeHTML(t.reporter_name || 'System')}</div>
                        <div class="text-[10px] text-slate-400">${escapeHTML(t.department_name || '-')}</div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="${ui.getBadgeClass('priority', t.priority)}">
                            ${t.priority}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="${ui.getBadgeClass('status', t.status)}">
                            ${t.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-1">
                            <button onclick="window.location.href='/ticket-detail.html?id=${t.id}'" class="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-95" title="ดูรายละเอียด">
                                <i data-lucide="search" class="w-4 h-4"></i>
                            </button>
                            <button onclick="viewTicket('${t.id}')" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95" title="แก้ไข">
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
            loadTickets();
        }

        document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
        document.getElementById('nextPage').addEventListener('click', () => goToPage(currentPage + 1));

        document.getElementById('itemsPerPageSelect').addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            loadTickets();
        });

        function openTicketModal() {
            document.getElementById('modalTitle').innerText = 'เปิดใบแจ้งซ่อมใหม่';
            document.getElementById('ticketForm').reset();
            document.getElementById('ticketId').value = '';
            document.getElementById('adminFields').classList.add('hidden');
            
            // Reset Choices
            Object.values(ui.choicesInstances).forEach(instance => {
                instance.setChoiceByValue('');
            });
            // Specific defaults
            if (ui.choicesInstances['ticketPriority']) ui.choicesInstances['ticketPriority'].setChoiceByValue('Medium');
            if (ui.choicesInstances['ticketStatus']) ui.choicesInstances['ticketStatus'].setChoiceByValue('Open');

            document.getElementById('ticketModal').classList.remove('hidden');
        }

        function closeTicketModal() {
            document.getElementById('ticketModal').classList.add('hidden');
        }

        async function viewTicket(id) {
            const ticket = allTickets.find(t => t.id === id);
            if (!ticket) return;

            const userObj = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdminOrTech = userObj.role === 'Admin' || userObj.role === 'Technician';

            document.getElementById('modalTitle').innerText = 'จัดการใบแจ้งซ่อม';
            document.getElementById('ticketId').value = ticket.id;
            document.getElementById('ticketSubject').value = ticket.subject;
            document.getElementById('ticketDesc').value = ticket.description || '';
            
            // Set Choices values
            if (ui.choicesInstances['ticketPriority']) ui.choicesInstances['ticketPriority'].setChoiceByValue(ticket.priority);
            if (ui.choicesInstances['ticketAsset']) ui.choicesInstances['ticketAsset'].setChoiceByValue(ticket.asset_id || '');
            
            if (isAdminOrTech) {
                document.getElementById('adminFields').classList.remove('hidden');
                if (ui.choicesInstances['ticketStatus']) ui.choicesInstances['ticketStatus'].setChoiceByValue(ticket.status);
                if (ui.choicesInstances['ticketAssignee']) ui.choicesInstances['ticketAssignee'].setChoiceByValue(ticket.assigned_to || '');
            } else {
                document.getElementById('adminFields').classList.add('hidden');
            }

            document.getElementById('ticketModal').classList.remove('hidden');
        }

        document.getElementById('ticketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('ticketId').value;
            const userObj = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdminOrTech = userObj.role === 'Admin' || userObj.role === 'Technician';

            const data = {
                id: id || null,
                subject: document.getElementById('ticketSubject').value,
                description: document.getElementById('ticketDesc').value,
                priority: document.getElementById('ticketPriority').value,
                asset_id: document.getElementById('ticketAsset').value || null,
                reporter_id: id ? undefined : userObj.id // Only for new
            };

            if (isAdminOrTech && id) {
                data.status = document.getElementById('ticketStatus').value;
                data.assigned_to = document.getElementById('ticketAssignee').value || null;
            }

            try {
                const response = await apiFetch('/api/tickets', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    notify.success(id ? 'อัปเดตข้อมูลสำเร็จ' : 'ส่งใบแจ้งซ่อมสำเร็จ');
                    closeTicketModal();
                    loadTickets();
                } else {
                    const err = await response.json();
                    notify.error(err.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                notify.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
        });

        // Search logic with 1s Debounce
        document.getElementById('ticketSearch').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                currentPage = 1;
                loadTickets();
            }, 1000);
        });

        document.addEventListener('DOMContentLoaded', loadInitialData);