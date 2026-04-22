import fs from 'fs';

const path = 'public/borrows.html';

const template = `<!DOCTYPE html>
<html lang="th" class="h-full bg-slate-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ยืม-คืนอุปกรณ์ | ITSM Admin</title>
    <script>
        if (!localStorage.getItem('token')) {
            window.location.replace('/login.html');
        }
    </script>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/lucide/0.454.0/lucide.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body class="h-full flex overflow-hidden">
    <div id="sidebarOverlay" class="fixed inset-0 bg-slate-900/50 z-40 hidden transition-opacity lg:hidden"></div>
    <div id="sidebar-container" class="lg:static"></div>

    <div class="flex-1 flex flex-col overflow-hidden">
        <div id="header-container"></div>

        <main class="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-10 bg-slate-50/50">
            <div class="max-w-7xl mx-auto space-y-8">
                <!-- Header Section -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight">ยืม-คืนอุปกรณ์</h1>
                        <p class="text-slate-500 mt-1 font-medium text-sm">จัดการการเบิกจ่ายและรับคืนครุภัณฑ์คอมพิวเตอร์</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="exportBorrows()" class="bg-white text-slate-700 px-5 py-3 rounded-2xl font-bold border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                            <i data-lucide="download" class="w-5 h-5"></i> Export
                        </button>
                        <button onclick="openBorrowModal()" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                            <i data-lucide="plus-circle" class="w-5 h-5"></i> บันทึกการยืมใหม่
                        </button>
                    </div>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                        <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                            <i data-lucide="book-open" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-800" id="statBorrowed">-</p>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">กำลังยืม</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                        <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                            <i data-lucide="arrow-left-to-line" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-800" id="statReturned">-</p>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">คืนแล้ว</p>
                        </div>
                    </div>
                    <div class="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                        <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                            <i data-lucide="alarm-clock" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-slate-800" id="statOverdue">-</p>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">เกินกำหนดคืน</p>
                        </div>
                    </div>
                </div>

                <!-- Filters & Table -->
                <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-6 border-b border-slate-100 bg-white/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div class="relative w-full sm:w-96">
                            <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input type="text" id="borrowSearch" class="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="ค้นหาตาม Tag, อุปกรณ์, หรือชื่อผู้ยืม...">
                        </div>
                        <div class="flex items-center gap-3 w-full sm:w-auto">
                            <select id="statusFilter" onchange="filterChanged()" class="bg-slate-100 border-none rounded-2xl text-sm px-4 py-3 focus:ring-2 focus:ring-indigo-500/20">
                                <option value="">ทุกสถานะ</option>
                                <option value="Borrowed">กำลังยืม</option>
                                <option value="Returned">คืนแล้ว</option>
                                <option value="Overdue">เกินกำหนดคืน</option>
                            </select>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th class="px-6 py-4">อุปกรณ์ / Tag</th>
                                    <th class="px-6 py-4">ผู้ยืม / แผนก</th>
                                    <th class="px-6 py-4">วันที่ยืม</th>
                                    <th class="px-6 py-4">กำหนดคืน</th>
                                    <th class="px-6 py-4 text-center">สถานะ</th>
                                    <th class="px-6 py-4 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="borrowTableBody" class="divide-y divide-slate-50 text-sm">
                                <!-- Data will be loaded here -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div class="p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-400 font-medium">แสดง</span>
                            <select id="itemsPerPageSelect" class="bg-slate-100 border-none rounded-xl text-xs px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500/20">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                        <div id="pageNumbers" class="flex items-center gap-1"></div>
                        <div class="flex items-center gap-2">
                            <button id="prevPage" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all">
                                <i data-lucide="chevron-left" class="w-5 h-5"></i>
                            </button>
                            <button id="nextPage" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-all">
                                <i data-lucide="chevron-right" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Borrow Modal -->
    <div id="borrowModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm hidden">
        <div class="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 class="text-xl font-black text-slate-800 tracking-tight">บันทึกการยืมครุภัณฑ์</h3>
                <button onclick="closeBorrowModal()" class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <form id="borrowForm" class="p-8 space-y-6">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">เลือกอุปกรณ์ที่ว่าง <span class="text-red-500">*</span></label>
                    <select id="borrowAsset" required class="form-input"></select>
                    <div id="borrowAssetLoading" class="mt-2 ml-1"></div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">เลือกผู้ใช้งาน <span class="text-red-500">*</span></label>
                    <select id="borrowUser" required class="form-input"></select>
                    <div id="borrowUserLoading" class="mt-2 ml-1"></div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">กำหนดคืนครุภัณฑ์</label>
                    <input type="date" id="borrowDueDate" class="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">บันทึกเพิ่มเติม</label>
                    <textarea id="borrowNotes" rows="3" class="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-medium focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none" placeholder="ระบุเหตุผลการยืม หรือรายละเอียดเพิ่มเติม..."></textarea>
                </div>

                <div class="pt-4 flex gap-3">
                    <button type="button" onclick="closeBorrowModal()" class="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95 cursor-pointer">
                        ยกเลิก
                    </button>
                    <button type="submit" id="submitBorrowBtn" class="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="save" class="w-5 h-5"></i> บันทึกการยืม
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="/assets/js/app.js"></script>
    <script>
        let currentPage = 1, itemsPerPage = 10, totalItemsCount = 0, totalPagesCount = 1;
        let searchTimer = null, allBorrows = [];
        let choiceAsset = null, choiceUser = null;

        function filterChanged() { currentPage = 1; loadBorrows(); }

        async function loadStats() {
            try {
                const res = await apiFetch('/api/borrows?action=stats');
                if (res && res.ok) {
                    const s = await res.json();
                    document.getElementById('statBorrowed').textContent = s.borrowed ?? 0;
                    document.getElementById('statReturned').textContent = s.returned ?? 0;
                    document.getElementById('statOverdue').textContent  = s.overdue  ?? 0;
                }
            } catch (e) {}
        }

        async function loadBorrows() {
            ui.renderTableLoading('borrowTableBody', 6, 'กำลังโหลดข้อมูลการยืม-คืน...');
            const search = document.getElementById('borrowSearch')?.value || '';
            const status = document.getElementById('statusFilter')?.value || '';
            try {
                const start = (currentPage - 1) * itemsPerPage + 1;
                const end   = currentPage * itemsPerPage;
                const params = new URLSearchParams({ start, end, search, status });
                const res = await apiFetch('/api/borrows?' + params.toString());
                if (!res || !res.ok) throw new Error('API Error');
                const data = await res.json();
                allBorrows = data.borrows;
                totalItemsCount = data.totalCount;
                totalPagesCount = data.totalPages;
                renderBorrows();
            } catch (err) {
                document.getElementById('borrowTableBody').innerHTML =
                    '<tr><td colspan="6" class="px-6 py-10 text-center text-red-500 font-medium">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
            }
        }

        function statusBadge(s) {
            const map = { Borrowed:'bg-amber-100 text-amber-700 border border-amber-200', Returned:'bg-emerald-100 text-emerald-700 border border-emerald-200', Overdue:'bg-red-100 text-red-700 border border-red-200' };
            const lbl = { Borrowed:'กำลังยืม', Returned:'คืนแล้ว', Overdue:'เกินกำหนดคืน' };
            return \`<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider \${map[s]||'bg-slate-100 text-slate-600'}">\${lbl[s]||s}</span>\`;
        }

        function renderBorrows() {
            const tbody = document.getElementById('borrowTableBody');
            if (!allBorrows || !allBorrows.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-400 font-medium">ไม่พบข้อมูลการยืม</td></tr>';
                ui.renderPagination('pageNumbers', currentPage, totalPagesCount, totalItemsCount, itemsPerPage);
                return;
            }
            const { role } = JSON.parse(localStorage.getItem('user') || '{}');
            const isStaff = role === 'Admin' || role === 'Technician';
            const frag = document.createDocumentFragment();
            allBorrows.forEach(b => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                const due = b.due_date ? new Date(b.due_date).toLocaleDateString('th-TH') : '-';
                const borrowed = b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString('th-TH') : '-';
                const overdueFlag = b.status === 'Overdue';
                const safeTag = escapeHTML(b.asset_tag).replace(/'/g, "\\\\'");
                tr.innerHTML = \`
                    <td class="px-6 py-4">
                        <div class="font-bold text-slate-800 text-sm">\${escapeHTML(b.asset_tag)}</div>
                        <div class="text-[10px] text-slate-400">\${escapeHTML(b.asset_name)}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-semibold text-slate-700">\${escapeHTML(b.borrower_name)}</div>
                        <div class="text-[10px] text-slate-400">\${escapeHTML(b.department_name||'-')}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600 font-medium">\${borrowed}</td>
                    <td class="px-6 py-4">
                        <span class="text-sm font-medium \${overdueFlag?'text-red-600 font-bold':'text-slate-600'}">\${due}</span>
                        \${overdueFlag?'<div class="text-[10px] text-red-500 font-bold mt-0.5">⚠ เกินกำหนด</div>':''}
                    </td>
                    <td class="px-6 py-4 text-center">\${statusBadge(b.status)}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-1">
                            \${b.status!=='Returned'&&isStaff?\`<button onclick="confirmReturn('\${b.id}','\${safeTag}')" class="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all active:scale-95"><i data-lucide="check-circle" class="w-3.5 h-3.5 inline mr-0.5"></i>คืน</button>\`:''}
                            \${isStaff?\`<button onclick="confirmDeleteBorrow('\${b.id}')" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>\`:''}
                        </div>
                    </td>\`;
                frag.appendChild(tr);
            });
            tbody.innerHTML = '';
            tbody.appendChild(frag);
            lucide.createIcons();
            ui.renderPagination('pageNumbers', currentPage, totalPagesCount, totalItemsCount, itemsPerPage);
        }

        async function confirmReturn(id, tag) {
            if (!await notify.confirm('ยืนยันการคืน', \`ยืนยันการรับคืนอุปกรณ์ "\${tag}"?\`)) return;
            const res = await apiFetch(\`/api/borrows?action=return&id=\${id}\`, { method:'POST' });
            if (res && res.ok) { notify.success('บันทึกการคืนสำเร็จ'); loadBorrows(); loadStats(); }
            else { const e = await res?.json().catch(()=>({})); notify.error(e.message||'เกิดข้อผิดพลาด'); }
        }

        async function confirmDeleteBorrow(id) {
            if (!await notify.confirm('ลบข้อมูล', 'ยืนยันการลบข้อมูลการยืมนี้หรือไม่?')) return;
            const res = await apiFetch(\`/api/borrows?action=delete&id=\${id}\`, { method:'POST' });
            if (res && res.ok) { notify.success('ลบข้อมูลสำเร็จ'); loadBorrows(); loadStats(); }
            else { const e = await res?.json().catch(()=>({})); notify.error(e.message||'เกิดข้อผิดพลาด'); }
        }

        function exportBorrows() {
            const token = localStorage.getItem('token');
            if (!token) return notify.error('กรุณาเข้าสู่ระบบ');
            window.location.href = \`/api/borrows?action=export&token=\${token}\`;
            notify.toast('กำลังดาวน์โหลด CSV...');
        }

        function destroyModalChoices() {
            if (choiceAsset) { try { choiceAsset.destroy(); } catch(e){} choiceAsset = null; }
            if (choiceUser)  { try { choiceUser.destroy();  } catch(e){} choiceUser  = null; }
        }

        async function openBorrowModal() {
            destroyModalChoices();
            document.getElementById('borrowDueDate').value = '';
            document.getElementById('borrowNotes').value   = '';
            const spinner = '<span class="text-xs text-slate-400 flex items-center gap-1"><span class="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span> กำลังโหลด...</span>';
            document.getElementById('borrowAssetLoading').innerHTML = spinner;
            document.getElementById('borrowUserLoading').innerHTML  = spinner;

            const assetEl = document.getElementById('borrowAsset');
            const userEl  = document.getElementById('borrowUser');
            assetEl.innerHTML = '';
            userEl.innerHTML  = '';

            document.getElementById('borrowModal').classList.remove('hidden');

            try {
                const [assetRes, userRes] = await Promise.all([
                    apiFetch('/api/assets?action=getOptions&status=Available', { silent: true }),
                    apiFetch('/api/users?action=getUsers', { silent: true })
                ]);

                let assets = [];
                if (assetRes && assetRes.ok) assets = await assetRes.json();
                assetEl.innerHTML = '<option value="">-- เลือกอุปกรณ์ที่ว่าง --</option>' +
                    assets.map(a => \`<option value="\${a.id}">\${a.asset_tag} - \${a.name}</option>\`).join('');
                document.getElementById('borrowAssetLoading').innerHTML = 
                    \`<span class="text-xs \${assets.length ? 'text-emerald-600' : 'text-amber-500'} font-medium">\${assets.length ? '✔ พร้อมให้ยืม ' + assets.length + ' รายการ' : '⚠ ไม่มีทรัพย์สินพร้อมให้ยืม'}</span>\`;

                let users = [];
                if (userRes && userRes.ok) {
                    const raw = await userRes.json();
                    users = Array.isArray(raw) ? raw : (raw.users || []);
                }
                userEl.innerHTML = '<option value="">-- เลือกผู้ยืม --</option>' +
                    users.map(u => \`<option value="\${u.id}">\${u.name}</option>\`).join('');
                document.getElementById('borrowUserLoading').innerHTML = 
                    \`<span class="text-xs \${users.length ? 'text-emerald-600' : 'text-red-500'} font-medium">\${users.length ? '✔ ' + users.length + ' คน' : '⚠ โหลดรายชื่อไม่สำเร็จ'}</span>\`;

                if (typeof Choices !== 'undefined') {
                    choiceAsset = new Choices(assetEl, { searchEnabled: true, itemSelectText: '', placeholder: true, placeholderValue: 'ค้นหาอุปกรณ์...', noResultsText: 'ไม่พบข้อมูล', allowHTML: false });
                    choiceUser = new Choices(userEl, { searchEnabled: true, itemSelectText: '', placeholder: true, placeholderValue: 'ค้นหาผู้ใช้งาน...', noResultsText: 'ไม่พบข้อมูล', allowHTML: false });
                }
            } catch (err) {
                console.error('openBorrowModal:', err);
                notify.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            }
        }

        function closeBorrowModal() {
            document.getElementById('borrowModal').classList.add('hidden');
            destroyModalChoices();
            document.getElementById('borrowAssetLoading').innerHTML = '';
            document.getElementById('borrowUserLoading').innerHTML  = '';
        }

        document.getElementById('borrowForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBorrowBtn');
            const originalHtml = btn.innerHTML;
            const asset_id    = document.getElementById('borrowAsset').value;
            const borrower_id = document.getElementById('borrowUser').value;
            const due_date    = document.getElementById('borrowDueDate').value;
            const notes       = document.getElementById('borrowNotes').value;

            if (!asset_id)    return notify.error('กรุณาเลือกอุปกรณ์');
            if (!borrower_id) return notify.error('กรุณาเลือกผู้ใช้งาน');

            btn.disabled = true;
            btn.innerHTML = \`<span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> <span>กำลังบันทึก...</span>\`;

            try {
                const res = await apiFetch('/api/borrows', {
                    method: 'POST',
                    body: JSON.stringify({ asset_id, borrower_id, due_date: due_date || null, notes })
                });
                if (res && res.ok) {
                    notify.success('บันทึกการยืมสำเร็จ');
                    closeBorrowModal();
                    loadBorrows();
                    loadStats();
                } else {
                    const err = await res?.json().catch(() => ({}));
                    notify.error(err.message || 'เกิดข้อผิดพลาด');
                }
            } catch (e) {
                notify.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                lucide.createIcons();
            }
        });

        document.getElementById('borrowSearch').addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => { currentPage = 1; loadBorrows(); }, 800);
        });
        document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadBorrows(); } });
        document.getElementById('nextPage').addEventListener('click', () => { if (currentPage < totalPagesCount) { currentPage++; loadBorrows(); } });
        document.getElementById('itemsPerPageSelect').addEventListener('change', e => { itemsPerPage = parseInt(e.target.value); currentPage = 1; loadBorrows(); });

        document.addEventListener('DOMContentLoaded', () => {
            ['statusFilter', 'itemsPerPageSelect'].forEach(id => {
                const el = document.getElementById(id);
                if (el && typeof Choices !== 'undefined') {
                    try { ui.choicesInstances[id] = new Choices(el, { searchEnabled:false, itemSelectText:'', shouldSort:false, allowHTML:false }); } catch(e) {}
                }
            });
            loadStats();
            loadBorrows();
        });
    </script>
</body>
</html>`;

fs.writeFileSync(path, template, 'utf8');
console.log('Fixed borrows.html encoding and content');
