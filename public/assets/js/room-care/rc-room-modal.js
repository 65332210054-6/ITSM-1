// ============================================================
// rc-room-modal.js — Room Details Modal + Repair History Filters
// ============================================================

function openRoomDetails(roomId) {
    // Find room across all branches
    let foundRoom = null;
    let foundBranchId = null;

    for (const bId in roomsDB) {
        const room = roomsDB[bId].find(r => r.id === roomId);
        if (room) {
            foundRoom = room;
            foundBranchId = bId;
            break;
        }
    }

    if (!foundRoom) return;
    selectedRoom = foundRoom;

    // Permissions checking
    const canEdit = checkRoomCareAccess('edit');
    const canDelete = checkRoomCareAccess('delete');
    const canCreate = checkRoomCareAccess('create');

    document.getElementById('detailRoomBadge').innerText = selectedRoom.number;
    document.getElementById('detailRoomTitle').innerText = `ห้อง ${selectedRoom.number} - ${selectedRoom.type}`;

    const branchObj = branchesDB.find(b => b.id === foundBranchId);
    document.getElementById('detailBranchTitle').innerText = `สาขา ${branchObj?.name || 'โรงแรม'}`;

    // Set Status Badge
    const badgeEl = document.getElementById('detailStatusBadge');
    badgeEl.className = 'status-badge';
    if (selectedRoom.status === 'Available') {
        badgeEl.classList.add('status-success');
        badgeEl.innerText = 'ปกติ';
    } else if (selectedRoom.status === 'Needs Repair') {
        badgeEl.classList.add('status-danger');
        badgeEl.innerText = 'รอการแก้ไข';
    } else if (selectedRoom.status === 'Closed') {
        badgeEl.classList.add('status-neutral');
        badgeEl.innerText = 'ปิดปรับปรุง';
    }

    // Hide/Show action buttons in the drawer based on permission
    const editRoomBtn = document.querySelector('button[onclick="editCurrentRoom()"]');
    if (editRoomBtn) editRoomBtn.style.display = canEdit ? '' : 'none';

    const deleteRoomBtn = document.querySelector('button[onclick="deleteCurrentRoom()"]');
    if (deleteRoomBtn) deleteRoomBtn.style.display = canDelete ? '' : 'none';

    const changeStatusBtn = document.querySelector('button[onclick="openChangeStatusModal()"]');
    if (changeStatusBtn) changeStatusBtn.style.display = canEdit ? '' : 'none';

    const inspectBtn = document.querySelector('button[onclick="openInspectionModal()"]');
    if (inspectBtn) inspectBtn.style.display = canCreate ? '' : 'none';

    const repairBtn = document.querySelector('button[onclick="openRepairModal()"]');
    if (repairBtn) repairBtn.style.display = canCreate ? '' : 'none';

    // Set Room Usage Status Checkbox
    const checkbox = document.getElementById('detailUsageCheckbox');
    const usageText = document.getElementById('detailUsageText');
    if (checkbox && usageText) {
        const isUsed = selectedRoom.usageStatus === 'InUse';
        checkbox.checked = isUsed;
        usageText.innerText = isUsed ? 'กำลังใช้งาน' : 'ว่าง';
    }

    // Set Last Inspected info
    document.getElementById('lastCheckDate').innerText = `ตรวจเมื่อ: ${new Date(selectedRoom.lastInspected).toLocaleDateString('th-TH')} โดย ${selectedRoom.inspector}`;

    const summaryContainer = document.getElementById('lastInspectionSummary');
    const details = selectedRoom.details || { electrical: 'Normal', ac: 'Normal', plumbing: 'Normal', furniture: 'Normal', appliances: 'Normal' };

    const renderIcon = (stat) => stat === 'Normal' ? '✔' : '⚠';
    const renderClass = (stat) => stat === 'Normal' ? 'text-emerald-600 font-extrabold' : 'text-rose-500 font-extrabold';

    // Dynamically render inspection summary based on the custom systems list
    const activeSystems = systemsList.filter(sys => sys !== 'Other');
    summaryContainer.innerHTML = activeSystems.map((sys, idx) => {
        const sysKey = sys.toLowerCase().replace(/\s+/g, '_');
        const sysDetails = getCategoryDetails(sys);
        const stat = details[sysKey] || 'Normal';

        // If it's the last item and we have an odd number of items, span 2 columns
        const isLastAndOdd = (idx === activeSystems.length - 1) && (idx % 2 === 0);
        const colSpanClass = isLastAndOdd ? 'col-span-2' : '';

        return `
            <div class="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 ${colSpanClass}">
                <span class="text-slate-500">${idx + 1}. ${sysDetails.thai}</span>
                <span class="${renderClass(stat)}">${renderIcon(stat)} ${stat === 'Normal' ? 'ปกติ' : 'ชำรุด'}</span>
            </div>
        `;
    }).join('');

    // Render Repair History Card
    const historyList = document.getElementById('repairHistoryList');
    const activeTickets = selectedRoom.activeTickets || [];
    if (activeTickets.length > 0) {
        historyList.innerHTML = activeTickets.map(t => {
            const actionBtn = canEdit ? `<button onclick="confirmFinishRepairJob('${selectedRoom.id}', '${t.id}')" class="px-3 py-1.5 text-xs font-black uppercase text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all active:scale-95 cursor-pointer">ปิดงาน</button>` : '';
            const editBtn = canEdit ? `<button onclick="openEditTicketModal('${selectedRoom.id}', '${t.id}')" class="px-3 py-1.5 text-xs font-black uppercase text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all active:scale-95 cursor-pointer">✏️ แก้ไข</button>` : '';

            const openedAtStr = t.openedAt ? `เปิดใบงาน: ${new Date(t.openedAt).toLocaleDateString('th-TH')} ${new Date(t.openedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : 'เปิดใบงาน: ไม่ระบุ';
            const lastModifiedAtStr = t.lastModifiedAt ? `<br><span class="text-amber-500 font-medium">แก้ไขล่าสุด: ${new Date(t.lastModifiedAt).toLocaleDateString('th-TH')} ${new Date(t.lastModifiedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>` : '';

            const categoryDetail = getCategoryDetails(t.category);

            return `
                <div class="p-4 bg-white rounded-2xl border-l-4 ${t.status === 'Needs Repair' ? 'border-l-rose-500 border-rose-100' : 'border-l-blue-500 border-blue-100'} border space-y-2.5 hover:border-slate-200 transition-colors shadow-sm">
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-black text-indigo-600 uppercase tracking-widest">${t.ticketNo || ('#' + t.id.slice(0, 8).toUpperCase())}</span>
                        <span class="status-badge ${t.status === 'Needs Repair' ? 'status-danger' : 'status-warning'} text-sm font-extrabold px-3 py-1">${t.status === 'Needs Repair' ? 'รอยืนยันซ่อม' : 'กำลังซ่อม'}</span>
                    </div>
                    <h4 class="text-sm font-bold text-slate-700 leading-snug">${escapeHTML(t.desc)}</h4>
                    <div class="text-xs text-slate-400 font-semibold flex items-center justify-between pt-1.5 border-t border-slate-100">
                        <span>ระบบ: ${categoryDetail.thai} | ช่าง: ${t.assignee || 'ไม่ระบุ'}</span>
                        <span class="text-indigo-600 font-bold">ค่าอะไหล่: ${t.cost}.-</span>
                    </div>
                    <div class="text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100/50">
                        <span>${openedAtStr}${lastModifiedAtStr}</span>
                    </div>
                    <div class="flex justify-end gap-2 pt-2 border-t border-slate-100/50">
                        ${editBtn}
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('<div class="h-3"></div>');
    } else {
        historyList.innerHTML = `
            <div class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium text-xs">
                <i data-lucide="wrench" class="w-6 h-6 text-slate-300 mx-auto mb-2"></i>
                ไม่มีงานซ่อมค้างในขณะนี้
            </div>
        `;
    }

    // Reset and apply completed repair history filters
    if (document.getElementById('filterRepairCategory')) {
        if (choiceFilterCategory) {
            choiceFilterCategory.setChoiceByValue('All');
        } else {
            document.getElementById('filterRepairCategory').value = 'All';
        }
        document.getElementById('filterRepairStart').value = '';
        document.getElementById('filterRepairEnd').value = '';
    }
    if (document.getElementById('repairFiltersArea')) {
        document.getElementById('repairFiltersArea').classList.add('hidden');
    }
    switchHistoryTab('repairs');

    document.getElementById('roomDetailsModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeRoomDetailsModal() {
    document.getElementById('roomDetailsModal').classList.add('hidden');
}

// ==========================================
// Completed Repair History with Filters
// ==========================================
function toggleRepairFilters() {
    const area = document.getElementById('repairFiltersArea');
    area.classList.toggle('hidden');
}

function applyRepairFilters() {
    if (!selectedRoom) return;

    const category = document.getElementById('filterRepairCategory').value;
    const startDateStr = document.getElementById('filterRepairStart').value;
    const endDateStr = document.getElementById('filterRepairEnd').value;

    const history = selectedRoom.repairHistory || [];

    let filtered = history;

    // Filter by system category
    if (category !== 'All') {
        filtered = filtered.filter(item => item.category === category);
    }

    // Filter by date range
    if (startDateStr) {
        const start = new Date(startDateStr);
        filtered = filtered.filter(item => new Date(item.date) >= start);
    }

    if (endDateStr) {
        const end = new Date(endDateStr);
        // Set end date to end of the day
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => new Date(item.date) <= end);
    }

    const pastRepairsList = document.getElementById('pastRepairsList');
    if (!pastRepairsList) return;

    if (filtered.length === 0) {
        pastRepairsList.innerHTML = `
            <div class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium text-[11px] space-y-1">
                <i data-lucide="history" class="w-5 h-5 text-slate-300 mx-auto mb-1"></i>
                <p>ไม่มีประวัติการซ่อมบำรุงที่ตรงกับเงื่อนไข</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const tableRows = filtered.map(item => {
        let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
        let sysName = item.category;
        const sysDetails = getCategoryDetails(item.category);
        if (sysDetails && sysDetails.thai) {
            sysName = sysDetails.thai.split(' (')[0];
        }
        if (item.category === 'Electrical') { badgeColor = 'bg-amber-50 text-amber-600 border-amber-100'; }
        else if (item.category === 'AC') { badgeColor = 'bg-blue-50 text-blue-600 border-blue-100'; }
        else if (item.category === 'Plumbing') { badgeColor = 'bg-teal-50 text-teal-600 border-teal-100'; }
        else if (item.category === 'Furniture') { badgeColor = 'bg-indigo-50 text-indigo-600 border-indigo-100'; }
        else if (item.category === 'Appliances') { badgeColor = 'bg-purple-50 text-purple-600 border-purple-100'; }
        else if (item.category === 'Other') { badgeColor = 'bg-slate-50 text-slate-700 border-slate-200'; }

        const openDate = item.openedAt ? new Date(item.openedAt) : new Date(new Date(item.date).getTime() - 2 * 24 * 60 * 60 * 1000);
        const formattedOpenDate = openDate.toLocaleDateString('th-TH');
        const formattedCloseDate = new Date(item.date).toLocaleDateString('th-TH');

        const costSuffix = item.cost ? ` (ค่าใช้จ่าย: ${item.cost}.-)` : '';
        const detailsText = `${escapeHTML(item.desc)}${costSuffix}`;

        const closedBy = item.closedBy || 'ไม่ระบุ';
        const closeNotes = item.closeNotes || 'ไม่มีหมายเหตุ';

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50/50 text-[11px] text-slate-700">
                <td class="py-2.5 px-3 font-extrabold text-indigo-600 whitespace-nowrap">
                    <button type="button" onclick="viewTicketDetails('${item.id}')" class="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer border-0 bg-transparent p-0 font-extrabold outline-none">
                        ${item.ticketNo || ('#' + item.id.slice(0, 8).toUpperCase())}
                    </button>
                </td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}">${sysName}</span></td>
                <td class="py-2.5 px-3 font-medium max-w-[150px] truncate" title="${detailsText}">${detailsText}</td>
                <td class="py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">${formattedOpenDate}</td>
                <td class="py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">${escapeHTML(item.assignee || 'ไม่ระบุ')}</td>
                <td class="py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">${formattedCloseDate}</td>
                <td class="py-2.5 px-3 text-slate-500 font-medium whitespace-nowrap">${escapeHTML(closedBy)}</td>
                <td class="py-2.5 px-3 font-medium max-w-[150px] truncate text-slate-500" title="${escapeHTML(closeNotes)}">${escapeHTML(closeNotes)}</td>
            </tr>
        `;
    }).join('');

    pastRepairsList.innerHTML = `
        <div class="overflow-x-auto border border-slate-100 rounded-xl logs-scrollbar">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 text-[10px] uppercase text-slate-400 font-extrabold border-b border-slate-100">
                        <th class="py-2 px-3">Ticket ID</th>
                        <th class="py-2 px-3">ระบบ</th>
                        <th class="py-2 px-3">อาการเสีย</th>
                        <th class="py-2 px-3">วันที่เปิด</th>
                        <th class="py-2 px-3">ช่างผู้รับผิดชอบ</th>
                        <th class="py-2 px-3">วันที่ปิด</th>
                        <th class="py-2 px-3">ผู้ปิดงาน</th>
                        <th class="py-2 px-3">หมายเหตุปิดงาน</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;

    lucide.createIcons();
}

// ==========================================
// History Tab Switching & Incidents Rendering
// ==========================================
let currentHistoryTab = 'repairs';

function switchHistoryTab(tabName) {
    currentHistoryTab = tabName;
    const tabRepairs = document.getElementById('tabBtnRepairs');
    const tabIncidents = document.getElementById('tabBtnIncidents');
    const repairsArea = document.getElementById('repairsHistoryArea');
    const incidentsArea = document.getElementById('incidentsHistoryArea');
    const toggleFilterBtn = document.getElementById('toggleFilterBtn');

    if (tabName === 'repairs') {
        if (tabRepairs) tabRepairs.className = 'pb-2 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 transition-all cursor-pointer';
        if (tabIncidents) tabIncidents.className = 'pb-2 text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all cursor-pointer';
        if (repairsArea) repairsArea.classList.remove('hidden');
        if (incidentsArea) incidentsArea.classList.add('hidden');
        if (toggleFilterBtn) toggleFilterBtn.style.display = '';
        applyRepairFilters();
    } else {
        if (tabIncidents) tabIncidents.className = 'pb-2 text-sm font-bold border-b-2 border-amber-600 text-amber-600 transition-all cursor-pointer';
        if (tabRepairs) tabRepairs.className = 'pb-2 text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all cursor-pointer';
        if (repairsArea) repairsArea.classList.add('hidden');
        if (incidentsArea) incidentsArea.classList.remove('hidden');
        if (toggleFilterBtn) toggleFilterBtn.style.display = 'none';
        renderRoomIncidents();
    }
}

function renderRoomIncidents() {
    if (!selectedRoom) return;
    const incidentsList = document.getElementById('pastIncidentsList');
    if (!incidentsList) return;

    const incidents = selectedRoom.incidents || [];
    if (incidents.length === 0) {
        incidentsList.innerHTML = `
            <div class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium text-xs">
                <i data-lucide="alert-triangle" class="w-6 h-6 text-slate-300 mx-auto mb-2"></i>
                ไม่มีประวัติเหตุการณ์ที่บันทึกไว้ในห้องนี้
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    incidentsList.innerHTML = incidents.map(inc => {
        let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
        if (inc.severity === 'Urgent' || inc.severity === 'High') badgeColor = 'bg-rose-50 text-rose-600 border-rose-200';
        else if (inc.severity === 'Normal') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
        else if (inc.severity === 'Low') badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';

        let catBadge = 'bg-slate-50 text-slate-500';
        if (inc.category === 'Guest Complaint') catBadge = 'bg-rose-50 text-rose-500';
        else if (inc.category === 'Property Damage') catBadge = 'bg-amber-50 text-amber-600';
        else if (inc.category === 'Lost & Found') catBadge = 'bg-teal-50 text-teal-600';
        else if (inc.category === 'Special Check') catBadge = 'bg-indigo-50 text-indigo-600';

        const createdDate = new Date(inc.createdAt).toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="p-3.5 bg-white rounded-2xl border border-slate-100 space-y-1.5 hover:border-slate-200 transition-colors shadow-sm text-xs">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500"></i>
                        ${escapeHTML(inc.title)}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeColor}">${escapeHTML(inc.severity)}</span>
                </div>
                ${inc.detail ? `<p class="text-slate-500 font-medium">${escapeHTML(inc.detail)}</p>` : ''}
                <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                    <span><span class="px-1.5 py-0.5 rounded-full ${catBadge} text-[9px] font-bold">${escapeHTML(inc.category)}</span> &middot; บันทึกโดย: ${escapeHTML(inc.reporter)}</span>
                    <span>${createdDate}</span>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function viewTicketDetails(ticketId) {
    if (!selectedRoom) return;
    const history = selectedRoom.repairHistory || [];
    let ticket = history.find(t => t.id === ticketId);
    let isActive = false;

    if (!ticket) {
        const active = selectedRoom.activeTickets || [];
        ticket = active.find(t => t.id === ticketId);
        isActive = true;
    }

    if (!ticket) return;

    const sysDetails = getCategoryDetails(ticket.category);
    const sysThai = sysDetails ? sysDetails.thai : ticket.category;

    const openDate = ticket.openedAt ? new Date(ticket.openedAt) : new Date(new Date(ticket.date).getTime() - 2 * 24 * 60 * 60 * 1000);
    const formattedOpenDate = openDate.toLocaleDateString('th-TH') + ' ' + (ticket.openedAt ? new Date(ticket.openedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '');

    let formattedCloseDate = '-';
    if (!isActive && ticket.date) {
        const closeDate = new Date(ticket.date);
        formattedCloseDate = closeDate.toLocaleDateString('th-TH');
    }

    let iconName = 'settings';
    let iconColor = 'text-slate-400';
    if (ticket.category === 'Electrical') { iconName = 'zap'; iconColor = 'text-amber-500'; }
    else if (ticket.category === 'AC') { iconName = 'wind'; iconColor = 'text-blue-500'; }
    else if (ticket.category === 'Plumbing') { iconName = 'droplet'; iconColor = 'text-teal-500'; }
    else if (ticket.category === 'Furniture') { iconName = 'sofa'; iconColor = 'text-indigo-500'; }
    else if (ticket.category === 'Appliances') { iconName = 'tv'; iconColor = 'text-purple-500'; }

    const priorityLabels = {
        'Low': '<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block uppercase">ต่ำ (LOW)</span>',
        'Medium': '<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-block uppercase">ปานกลาง (MEDIUM)</span>',
        'High': '<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 inline-block uppercase">สูง (HIGH)</span>',
        'Critical': '<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white border border-red-800 animate-pulse inline-block uppercase">วิกฤต (CRITICAL)</span>'
    };
    const priorityHtml = priorityLabels[ticket.priority] || `<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-350 inline-block">${ticket.priority}</span>`;

    let statusHtml = '';
    if (isActive) {
        if (ticket.status === 'Repairing') {
            statusHtml = `<span class="px-3 py-1 rounded-full text-sm font-extrabold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>กำลังดำเนินการ</span>`;
        } else {
            statusHtml = `<span class="px-3 py-1 rounded-full text-sm font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>รอยืนยันเข้าตรวจ</span>`;
        }
    } else {
        statusHtml = `<span class="px-3 py-1 rounded-full text-sm font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ดำเนินการเสร็จสิ้น
        </span>`;
    }

    const ticketNo = ticket.ticketNo || ticket.ticket_no || `#TICKET-${ticket.id.toUpperCase().replace('TK-AUTO-', 'AUTO-').replace('TK-', '')}`;

    Swal.fire({
        title: `<div style="text-align: left; font-weight: 800; color: #1e293b; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; width: 100%; font-size: 22px;">
                    <span style="color: #1e293b;">${ticketNo}</span>
                    <span style="color: #cbd5e1; font-weight: 300; margin: 0 10px;">|</span>
                    <span style="color: #334155; font-size: 20px; font-weight: 700;">รายละเอียดใบงานซ่อมแซม</span>
                </div>`,
        html: `
            <div class="text-left space-y-4 text-sm font-semibold text-slate-650 pt-3 max-h-[75vh] overflow-y-auto pr-1 logs-scrollbar">
                
                <!-- Section 1 -->
                <h4 class="text-base font-bold text-slate-800 mb-1.5 mt-1">ข้อมูลทั่วไปและปัญหา</h4>
                <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-3">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ระบบงาน</p>
                            <div class="flex items-center gap-1.5 text-base font-bold text-slate-800">
                                <i data-lucide="${iconName}" class="w-5 h-5 ${iconColor}"></i>
                                <span>${sysThai}</span>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ระดับความสำคัญ</p>
                            <div class="flex items-center">${priorityHtml}</div>
                        </div>
                    </div>
                    <div class="border-t border-slate-100 pt-3">
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">รายละเอียดปัญหา</p>
                        <div class="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">${escapeHTML(ticket.desc)}</div>
                    </div>
                </div>

                <!-- Section 2 -->
                <h4 class="text-base font-bold text-slate-800 mb-1.5 mt-3">แผนผังเวลาและผู้ดำเนินการ</h4>
                <div class="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                    <div class="grid grid-cols-2 divide-x divide-slate-100">
                        <div class="p-3.5 space-y-1 bg-white">
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">วันที่เปิดใบงาน</p>
                            <p class="text-sm font-bold text-slate-800">${formattedOpenDate}</p>
                        </div>
                        <div class="p-3.5 space-y-1 bg-white">
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">ผู้รับผิดชอบ (ช่าง)</p>
                            <p class="text-sm font-bold text-slate-800">${escapeHTML(ticket.assignee || 'ไม่ระบุ')}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 divide-x divide-slate-100">
                        <div class="p-3.5 space-y-1 bg-white">
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">วันที่ปิดใบงาน</p>
                            <p class="text-sm font-bold text-slate-800">${formattedCloseDate}</p>
                        </div>
                        <div class="p-3.5 space-y-1 bg-white">
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">ผู้ปิดงาน</p>
                            <p class="text-sm font-bold text-slate-800">${escapeHTML(ticket.closedBy || '-')}</p>
                        </div>
                    </div>
                </div>

                <!-- Section 3 -->
                <div class="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-3 mt-3">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ค่าใช้จ่ายค่าอะไหล่:</p>
                            <p class="text-base font-black text-slate-800">${ticket.cost ? ticket.cost.toLocaleString() : '0'} บาท</p>
                        </div>
                        <div>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">สถานะใบงาน:</p>
                            <div class="flex items-center">${statusHtml}</div>
                        </div>
                    </div>
                    <div class="border-t border-slate-100 pt-3">
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">หมายเหตุการปิดงาน:</p>
                        <div class="text-sm font-medium text-slate-650 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">${escapeHTML(ticket.closeNotes || 'ไม่มีหมายเหตุ')}</div>
                    </div>
                </div>

            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        heightAuto: false,
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl max-w-xl w-full',
            closeButton: 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-0 outline-none rounded-xl'
        },
        didOpen: () => {
            lucide.createIcons();
        }
    });
}

function resetRepairFilters() {
    if (choiceFilterCategory) {
        choiceFilterCategory.setChoiceByValue('All');
    } else {
        document.getElementById('filterRepairCategory').value = 'All';
    }
    document.getElementById('filterRepairStart').value = '';
    document.getElementById('filterRepairEnd').value = '';
    applyRepairFilters();
}

function downloadRepairHistoryCSV() {
    if (!selectedRoom) return;

    if (currentHistoryTab === 'incidents') {
        const incidents = selectedRoom.incidents || [];
        if (incidents.length === 0) {
            Swal.fire({
                title: 'ไม่พบข้อมูล',
                text: 'ไม่พบประวัติเหตุการณ์เพื่อดาวน์โหลด',
                icon: 'warning',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#4f46e5',
                customClass: { popup: 'rounded-3xl border-0 shadow-2xl', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
            });
            return;
        }

        const headers = ['Incident Title', 'Category', 'Severity', 'Details', 'Reporter', 'Date'];
        const rows = incidents.map(inc => [
            inc.title,
            inc.category,
            inc.severity,
            inc.detail || '',
            inc.reporter,
            new Date(inc.createdAt).toLocaleString('th-TH')
        ]);

        const csvContent = [headers, ...rows]
            .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `incidents_history_room_${selectedRoom.number}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        notify.success('ดาวน์โหลดรายงานประวัติเหตุการณ์สำเร็จ!');
        return;
    }

    const category = document.getElementById('filterRepairCategory').value;
    const startDateStr = document.getElementById('filterRepairStart').value;
    const endDateStr = document.getElementById('filterRepairEnd').value;

    const history = selectedRoom.repairHistory || [];
    let filtered = history;

    // Filter by system category
    if (category !== 'All') {
        filtered = filtered.filter(item => item.category === category);
    }

    // Filter by date range
    if (startDateStr) {
        const start = new Date(startDateStr);
        filtered = filtered.filter(item => new Date(item.date) >= start);
    }

    if (endDateStr) {
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => new Date(item.date) <= end);
    }

    if (filtered.length === 0) {
        Swal.fire({
            title: 'ไม่พบข้อมูล',
            text: 'ไม่พบประวัติการซ่อมบำรุงที่ตรงกับเงื่อนไขการกรองเพื่อดาวน์โหลด',
            icon: 'warning',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#4f46e5',
            customClass: {
                popup: 'rounded-3xl border-0 shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold'
            }
        });
        return;
    }

    // Generate CSV headers and rows
    const headers = ['Ticket ID', 'System', 'Priority', 'Description', 'Opened Date', 'Assignee', 'Closed Date', 'Closed By', 'Close Notes', 'Cost'];
    const rows = filtered.map(item => {
        const openDate = item.openedAt ? new Date(item.openedAt) : new Date(new Date(item.date).getTime() - 2 * 24 * 60 * 60 * 1000);
        const formattedOpenDate = openDate.toLocaleDateString('th-TH');
        const formattedCloseDate = new Date(item.date).toLocaleDateString('th-TH');

        const sysDetails = getCategoryDetails(item.category);
        const sysThai = sysDetails ? sysDetails.thai : item.category;

        return [
            item.ticketNo || item.id.toUpperCase(),
            sysThai,
            item.priority || 'Medium',
            item.desc || '',
            formattedOpenDate,
            item.assignee || 'ไม่ระบุ',
            formattedCloseDate,
            item.closedBy || 'ไม่ระบุ',
            item.closeNotes || 'ไม่มีหมายเหตุ',
            item.cost || 0
        ];
    });

    const csvContent = [headers, ...rows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // Download CSV with BOM for Thai character encoding in Excel
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `repair_history_room_${selectedRoom.number}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify.success('ดาวน์โหลดรายงานประวัติการซ่อมสำเร็จ!');
}

async function toggleRoomUsage() {
    if (!selectedRoom) return;
    const checkbox = document.getElementById('detailUsageCheckbox');
    const usageText = document.getElementById('detailUsageText');
    if (!checkbox) return;

    const isChecked = checkbox.checked;
    const oldUsage = selectedRoom.usageStatus || 'Vacant';
    const newUsage = isChecked ? 'InUse' : 'Vacant';

    if (oldUsage === newUsage) return;

    selectedRoom.usageStatus = newUsage;
    if (usageText) {
        usageText.innerText = isChecked ? 'กำลังใช้งาน' : 'ว่าง';
    }

    await addActionLog('แก้ไขสถานะใช้งาน', `เปลี่ยนสถานะใช้งานห้อง ${selectedRoom.number} เป็น "${isChecked ? 'กำลังใช้งาน' : 'ว่าง'}"`);
    if (typeof renderDashboard === 'function') renderDashboard();

    notify.success(`อัปเดตสถานะห้องเป็น "${isChecked ? 'กำลังใช้งาน' : 'ว่าง'}" สำเร็จ!`);
}
