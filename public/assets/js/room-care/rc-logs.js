// ============================================================
// rc-logs.js — Room Care Data Center & History Filters
// Handles: Dynamic filtering for Repair History & Incident Logs
// ============================================================

let currentFilteredData = [];
let currentDataType = 'repair';

// Choices.js instances for filter selects
let choiceFilterDataType = null;
let choiceFilterBranch = null;
let choiceFilterSystem = null;

// Initialize filters on load
function initLogsPage() {
    const branchSelect = document.getElementById('filterBranchSelect');
    if (!branchSelect) return;

    // Populate branches dropdown
    if (typeof branchesDB !== 'undefined' && branchesDB.length > 0) {
        const branchOptions = '<option value="">-- กรุณาเลือกสาขา --</option>' +
            branchesDB.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        branchSelect.innerHTML = branchOptions;

        // Auto select first branch if available
        if (branchesDB[0]) {
            branchSelect.value = branchesDB[0].id;
        }
    }

    // Initialize Choices.js for filter dropdowns (uses pre-designed CSS from styles.css)
    if (typeof Choices !== 'undefined') {
        const typeEl = document.getElementById('filterDataType');
        const systemEl = document.getElementById('filterSystemSelect');

        if (typeEl && !choiceFilterDataType) {
            choiceFilterDataType = new Choices(typeEl, {
                searchEnabled: false,
                itemSelectText: '',
                allowHTML: false
            });
            typeEl.addEventListener('change', onDataTypeChange);
        }

        if (branchSelect && !choiceFilterBranch) {
            // Update choices with dynamic branch options first
            if (typeof branchesDB !== 'undefined' && branchesDB.length > 0) {
                const dynamicChoices = [
                    { value: '', label: '-- กรุณาเลือกสาขา --', selected: false },
                    ...branchesDB.map(b => ({ value: b.id, label: b.name, selected: branchesDB[0] && b.id === branchesDB[0].id }))
                ];
                branchSelect.innerHTML = '';
                dynamicChoices.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.textContent = opt.label;
                    if (opt.selected) o.selected = true;
                    branchSelect.appendChild(o);
                });
            }

            choiceFilterBranch = new Choices(branchSelect, {
                searchEnabled: branchesDB && branchesDB.length > 4,
                itemSelectText: '',
                allowHTML: false
            });
            branchSelect.addEventListener('change', executeFilterSearch);
        }

        if (systemEl && !choiceFilterSystem) {
            choiceFilterSystem = new Choices(systemEl, {
                searchEnabled: false,
                itemSelectText: '',
                allowHTML: false
            });
            systemEl.addEventListener('change', executeFilterSearch);
        }
    }

    onDataTypeChange();
}

function onDataTypeChange() {
    const typeSelect = document.getElementById('filterDataType');
    const systemWrapper = document.getElementById('filterSystemWrapper');
    const resultTitle = document.getElementById('resultTitle');

    if (!typeSelect) return;

    currentDataType = typeSelect.value;

    if (currentDataType === 'repair') {
        if (systemWrapper) systemWrapper.classList.remove('hidden');
        if (resultTitle) resultTitle.innerText = 'ประวัติการซ่อม';
    } else {
        if (systemWrapper) systemWrapper.classList.add('hidden');
        if (resultTitle) resultTitle.innerText = 'บันทึกเหตุการณ์';
    }

    executeFilterSearch();
}

async function executeFilterSearch() {
    const container = document.getElementById('dataTableContainer');
    const warning = document.getElementById('filterBranchWarning');
    const branchSelect = document.getElementById('filterBranchSelect');

    if (!container) return;

    const branchId = branchSelect ? branchSelect.value : '';

    if (!branchId) {
        if (warning) warning.classList.remove('hidden');
        container.innerHTML = `
            <div class="py-16 text-center text-slate-400 space-y-3">
                <div class="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <i data-lucide="building" class="w-7 h-7"></i>
                </div>
                <h4 class="font-extrabold text-slate-700 text-sm">กรุณาเลือกสาขาเพื่อดูข้อมูล</h4>
                <p class="text-xs text-slate-400 max-w-sm mx-auto">เลือกสาขาโรงแรมในช่องค้นหาด้านบน เพื่อสืบค้นประวัติการซ่อมและบันทึกเหตุการณ์</p>
            </div>
        `;
        document.getElementById('resultCountBadge').innerText = '0 รายการ';
        document.getElementById('repairStatsSummary')?.classList.add('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    if (warning) warning.classList.add('hidden');

    container.innerHTML = `
        <div class="py-16 text-center text-slate-400 space-y-3">
            <div class="inline-block animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full"></div>
            <p class="text-xs font-bold text-slate-500">กำลังค้นหาข้อมูล...</p>
        </div>
    `;

    const roomNumber = document.getElementById('filterRoomNumber')?.value || '';
    const keyword = document.getElementById('filterKeyword')?.value.trim().toLowerCase() || '';
    const category = document.getElementById('filterSystemSelect')?.value || '';
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';

    try {
        let endpoint = '';
        if (currentDataType === 'repair') {
            endpoint = `/api/room-care?action=repair_history&branch_id=${encodeURIComponent(branchId)}`
                + `&room_number=${encodeURIComponent(roomNumber)}`
                + `&category=${encodeURIComponent(category)}`
                + `&start_date=${encodeURIComponent(startDate)}`
                + `&end_date=${encodeURIComponent(endDate)}`;
        } else {
            endpoint = `/api/room-care?action=incidents_history&branch_id=${encodeURIComponent(branchId)}`
                + `&room_number=${encodeURIComponent(roomNumber)}`
                + `&start_date=${encodeURIComponent(startDate)}`
                + `&end_date=${encodeURIComponent(endDate)}`;
        }

        const data = await rcFetch(endpoint);
        let fetchedData = Array.isArray(data) ? data : [];

        // Apply keyword search filtering across all record fields
        if (keyword) {
            fetchedData = fetchedData.filter(item => {
                const ticketNo = String(item.ticket_no || item.id || '').toLowerCase();
                const desc = String(item.desc || '').toLowerCase();
                const assignee = String(item.assignee || item.closed_by || '').toLowerCase();
                const title = String(item.title || '').toLowerCase();
                const detail = String(item.detail || '').toLowerCase();
                const reporter = String(item.reporter || '').toLowerCase();
                const categoryStr = String(item.category || '').toLowerCase();
                const roomNum = String(item.room_number || '').toLowerCase();
                const branchName = String(item.branch_name || item.branch_id || '').toLowerCase();
                const closeNotes = String(item.close_notes || '').toLowerCase();
                const status = String(item.status || '').toLowerCase();

                return ticketNo.includes(keyword) ||
                    desc.includes(keyword) ||
                    assignee.includes(keyword) ||
                    title.includes(keyword) ||
                    detail.includes(keyword) ||
                    reporter.includes(keyword) ||
                    categoryStr.includes(keyword) ||
                    roomNum.includes(keyword) ||
                    branchName.includes(keyword) ||
                    closeNotes.includes(keyword) ||
                    status.includes(keyword);
            });
        }

        currentFilteredData = fetchedData;
        renderDataTable(currentFilteredData);
    } catch (err) {
        console.error('Filter Search Error:', err);
        container.innerHTML = `
            <div class="py-12 text-center text-rose-500 text-xs font-medium space-y-2">
                <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto text-rose-400"></i>
                <p>เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function renderDataTable(data) {
    const container = document.getElementById('dataTableContainer');
    const countBadge = document.getElementById('resultCountBadge');
    const statsSummary = document.getElementById('repairStatsSummary');
    if (!container) return;

    countBadge.innerText = `${data.length} รายการ`;

    if (data.length === 0) {
        statsSummary?.classList.add('hidden');
        container.innerHTML = `
            <div class="py-16 text-center text-slate-400 space-y-3">
                <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <i data-lucide="inbox" class="w-6 h-6"></i>
                </div>
                <h4 class="font-bold text-slate-600 text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</h4>
                <p class="text-xs text-slate-400">ลองปรับเปลี่ยนตัวกรองค้นหาหรือล้างค่ากรองเพื่อลองใหม่อีกครั้ง</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    if (currentDataType === 'repair') {
        // Calculate Total Cost
        const totalCost = data.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
        if (statsSummary) {
            statsSummary.classList.remove('hidden');
            document.getElementById('totalRepairCost').innerText = totalCost.toLocaleString('th-TH');
        }

        let tableHtml = `
            <div class="overflow-x-auto border border-slate-100 rounded-2xl">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-extrabold uppercase tracking-wider text-[11px]">
                            <th class="py-3 px-4 min-w-[150px] whitespace-nowrap">เลขใบงาน / วันที่</th>
                            <th class="py-3 px-4 min-w-[140px] whitespace-nowrap">สาขา</th>
                            <th class="py-3 px-4 min-w-[100px] whitespace-nowrap">ห้อง</th>
                            <th class="py-3 px-4 min-w-[130px] whitespace-nowrap">ระบบ</th>
                            <th class="py-3 px-4 min-w-[220px] whitespace-nowrap">รายละเอียดงานซ่อม</th>
                            <th class="py-3 px-4 min-w-[140px] whitespace-nowrap">ช่าง / ผู้ปิดงาน</th>
                            <th class="py-3 px-4 text-center min-w-[120px] whitespace-nowrap">สถานะ</th>
                            <th class="py-3 px-4 text-center min-w-[130px] whitespace-nowrap">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-slate-700">
        `;

        const canDelete = checkRoomCareAccess('delete');

        data.forEach((item, index) => {
            const catDetails = typeof getCategoryDetails === 'function' ? getCategoryDetails(item.category) : { name: item.category, thai: item.category, color: 'text-slate-600', icon: 'wrench' };
            const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

            const rawDesc = item.desc || '-';
            const displayDesc = rawDesc.length > 30 ? rawDesc.substring(0, 30) + '...' : rawDesc;

            let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">${item.status}</span>`;
            if (item.status === 'Needs Repair' || item.status === 'รอการแก้ไข') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100">รอการแก้ไข</span>`;
            } else if (item.status === 'Repairing' || item.status === 'กำลังซ่อม') {
                statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-100">กำลังซ่อม</span>`;
            } else if (item.status === 'Closed' || item.status === 'ซ่อมสำเร็จ' || item.is_history) {
                statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">ซ่อมสำเร็จ</span>`;
            }

            tableHtml += `
                <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        <div class="font-extrabold text-slate-800">${item.ticket_no || item.id || '-'}</div>
                        <div class="text-[10px] text-slate-400 font-medium">${formattedDate}</div>
                    </td>
                    <td class="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">${item.branch_name || item.branch_id || '-'}</td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        <span class="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black text-xs">
                            ${item.room_number || '-'}
                        </span>
                    </td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 font-bold ${catDetails.color}">
                            <i data-lucide="${catDetails.icon}" class="w-3.5 h-3.5"></i> ${catDetails.thai || item.category}
                        </span>
                    </td>
                    <td class="py-3.5 px-4 min-w-[220px] whitespace-nowrap" title="${rawDesc}">
                        <span class="font-medium text-slate-800">${displayDesc}</span>
                        ${item.cost > 0 ? `<span class="ml-1.5 text-[10px] text-emerald-600 font-bold">(ค่าซ่อม: ${parseFloat(item.cost).toLocaleString('th-TH')} ฿)</span>` : ''}
                    </td>
                    <td class="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div class="font-bold text-slate-700">${item.assignee || item.closed_by || '-'}</div>
                    </td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="openDataDetailModal(${index})" class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                                รายละเอียด
                            </button>
                            ${canDelete ? `<button onclick="deleteHistoryRecord(${index})" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer" title="ลบรายการนี้"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
    } else {
        // Incident History
        statsSummary?.classList.add('hidden');

        let tableHtml = `
            <div class="overflow-x-auto border border-slate-100 rounded-2xl">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-extrabold uppercase tracking-wider text-[11px]">
                            <th class="py-3 px-4 min-w-[145px] whitespace-nowrap">วันที่ / เวลา</th>
                            <th class="py-3 px-4 min-w-[140px] whitespace-nowrap">สาขา</th>
                            <th class="py-3 px-4 min-w-[110px] whitespace-nowrap">ห้อง</th>
                            <th class="py-3 px-4 min-w-[160px]">หัวข้อเหตุการณ์</th>
                            <th class="py-3 px-4 min-w-[200px] whitespace-nowrap">รายละเอียด</th>
                            <th class="py-3 px-4 min-w-[120px] whitespace-nowrap">ความรุนแรง</th>
                            <th class="py-3 px-4 min-w-[140px] whitespace-nowrap">ผู้บันทึก</th>
                            <th class="py-3 px-4 text-center min-w-[130px] whitespace-nowrap">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-slate-700">
        `;

        const canDelete = checkRoomCareAccess('delete');

        data.forEach((item, index) => {
            const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

            const rawDetail = item.detail || '-';
            const displayDetail = rawDetail.length > 30 ? rawDetail.substring(0, 30) + '...' : rawDetail;

            let severityBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">ปกติ</span>`;
            if (item.severity === 'High' || item.severity === 'วิกฤต') {
                severityBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">วิกฤต / สูง</span>`;
            } else if (item.severity === 'Medium' || item.severity === 'ปานกลาง') {
                severityBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">ปานกลาง</span>`;
            }

            tableHtml += `
                <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                        ${formattedDate}
                    </td>
                    <td class="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">${item.branch_name || item.branch_id || '-'}</td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        <span class="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-black text-xs">
                            ${item.room_number || '-'}
                        </span>
                    </td>
                    <td class="py-3.5 px-4 font-extrabold text-slate-800 max-w-xs truncate" title="${item.title || ''}">
                        ${item.title || '-'}
                    </td>
                    <td class="py-3.5 px-4 min-w-[200px] whitespace-nowrap text-slate-600" title="${rawDetail}">
                        <span class="font-medium text-slate-700">${displayDetail}</span>
                    </td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        ${severityBadge}
                    </td>
                    <td class="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">
                        ${item.reporter || '-'}
                    </td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="openDataDetailModal(${index})" class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer">
                                รายละเอียด
                            </button>
                            ${canDelete ? `<button onclick="deleteHistoryRecord(${index})" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer" title="ลบรายการนี้"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function resetDataFilters() {
    const roomInput = document.getElementById('filterRoomNumber');
    const keywordInput = document.getElementById('filterKeyword');
    const startDate = document.getElementById('filterStartDate');
    const endDate = document.getElementById('filterEndDate');

    if (roomInput) roomInput.value = '';
    if (keywordInput) keywordInput.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';

    // Reset Choices.js instance for system select
    if (choiceFilterSystem) {
        choiceFilterSystem.setChoiceByValue('');
    } else {
        const systemSelect = document.getElementById('filterSystemSelect');
        if (systemSelect) systemSelect.value = '';
    }

    executeFilterSearch();
}

function openDataDetailModal(index) {
    const item = currentFilteredData[index];
    if (!item) return;

    const modal = document.getElementById('dataDetailModal');
    const title = document.getElementById('detailModalTitle');
    const body = document.getElementById('detailModalBody');
    if (!modal || !body) return;

    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

    if (currentDataType === 'repair') {
        title.innerText = `รายละเอียดประวัติการซ่อม #${item.ticket_no || item.id}`;
        body.innerHTML = `
            <div class="space-y-4 text-xs">
                <div class="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">สาขา</span>
                        <span class="font-extrabold text-slate-800 text-sm">${item.branch_name || item.branch_id || '-'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">หมายเลขห้อง</span>
                        <span class="font-black text-indigo-600 text-sm">${item.room_number || '-'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">ระบบที่เปิดซ่อม</span>
                        <span class="font-extrabold text-slate-800">${item.category || '-'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">สถานะ</span>
                        <span class="font-extrabold text-emerald-600">${item.status || '-'}</span>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                    <span class="text-slate-400 font-bold block">รายละเอียดปัญหา / อาการที่แจ้งซ่อม</span>
                    <p class="text-slate-800 font-medium leading-relaxed">${item.desc || '-'}</p>
                </div>

                ${item.close_notes ? `
                <div class="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-1">
                    <span class="text-emerald-700 font-extrabold block">บันทึกการแก้ไข / หมายเหตุปิดงาน</span>
                    <p class="text-emerald-900 font-medium">${item.close_notes}</p>
                </div>
                ` : ''}

                <div class="grid grid-cols-2 gap-3 text-slate-600 font-medium pt-2">
                    <div><b>ช่างผู้รับผิดชอบ/ปิดงาน:</b> ${item.assignee || item.closed_by || '-'}</div>
                    <div><b>ค่าใช้จ่ายซ่อมแซม:</b> ${parseFloat(item.cost || 0).toLocaleString('th-TH')} ฿</div>
                    <div class="col-span-2"><b>วันที่บันทึก:</b> ${formattedDate}</div>
                </div>
            </div>
        `;
    } else {
        title.innerText = `รายละเอียดบันทึกเหตุการณ์`;
        body.innerHTML = `
            <div class="space-y-4 text-xs">
                <div class="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">สาขา</span>
                        <span class="font-extrabold text-slate-800 text-sm">${item.branch_name || item.branch_id || '-'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">หมายเลขห้อง</span>
                        <span class="font-black text-indigo-600 text-sm">${item.room_number || 'ไม่ระบุ'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">สถานะ</span>
                        <span class="font-extrabold text-amber-600">${item.severity || 'Normal'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-bold block mb-1">ผู้บันทึกเหตุการณ์</span>
                        <span class="font-extrabold text-slate-800">${item.reporter || '-'}</span>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                    <span class="text-slate-400 font-bold block">หัวข้อเหตุการณ์</span>
                    <p class="text-slate-900 font-extrabold text-sm">${item.title || '-'}</p>
                </div>

                <div class="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                    <span class="text-slate-400 font-bold block">รายละเอียดเหตุการณ์</span>
                    <p class="text-slate-800 font-medium leading-relaxed">${item.detail || '-'}</p>
                </div>

                <div class="text-slate-500 font-medium pt-2">
                    <b>วันที่บันทึกเหตุการณ์:</b> ${formattedDate}
                </div>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeDataDetailModal() {
    const modal = document.getElementById('dataDetailModal');
    if (modal) modal.classList.add('hidden');
}

// Legacy / compatibility functions
function renderLogsPanel() {
    if (document.getElementById('filterBranchSelect')) {
        initLogsPage();
    }
}
function toggleLogFilters() { }
function applyLogFilters() { }
function resetLogFilters() { }
function openLogDetailModal() { }
function closeLogDetailModal() { }

// ============================================================
// deleteHistoryRecord — ลบประวัติย้อนหลังตามสิทธิ์
// ============================================================
async function deleteHistoryRecord(index) {
    if (!checkRoomCareAccess('delete')) {
        notify.error('คุณไม่มีสิทธิ์ในการลบข้อมูลประวัติ');
        return;
    }

    const item = currentFilteredData[index];
    if (!item) return;

    const isRepair = currentDataType === 'repair';
    const recordLabel = isRepair
        ? `ใบงาน ${item.ticket_no || item.id || ''} ห้อง ${item.room_number || ''}`
        : `เหตุการณ์: ${item.title || ''} ห้อง ${item.room_number || ''}`;

    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        html: `<p class="text-sm text-slate-600">คุณต้องการลบ <b class="text-rose-600">${recordLabel}</b> ออกจากระบบ?</p><p class="text-xs text-slate-400 mt-2">การลบนี้ไม่สามารถย้อนกลับได้</p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'ลบรายการนี้',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        }
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'กำลังลบข้อมูล...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        if (isRepair) {
            await rcFetch(`/api/room-care?action=delete_ticket&ticket_id=${encodeURIComponent(item.id)}`, {
                method: 'DELETE'
            });
        } else {
            await rcFetch(`/api/room-care?action=delete_incident&incident_id=${encodeURIComponent(item.id)}`, {
                method: 'DELETE'
            });
        }

        // Remove from local array and re-render
        currentFilteredData.splice(index, 1);
        Swal.close();
        renderDataTable(currentFilteredData);
        notify.success('ลบรายการสำเร็จ!');
    } catch (err) {
        Swal.close();
        console.error('deleteHistoryRecord:', err);
        notify.error('เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message);
    }
}
