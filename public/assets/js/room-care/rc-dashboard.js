// ============================================================
// rc-dashboard.js — renderDashboard & renderLogsPanel
// ============================================================

function renderDashboard() {
    const branchEl = document.getElementById('branchSelect');
    if (!branchEl) return;
    const branchId = branchEl.value;
    const rooms = roomsDB[branchId] || [];

    // Calculate stats
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'Available').length;
    const needsRepair = rooms.filter(r => r.status === 'Needs Repair').length;
    const closed = rooms.filter(r => r.status === 'Closed').length;

    document.getElementById('statTotalRooms').innerText = total;
    document.getElementById('statAvailableRooms').innerText = available;
    document.getElementById('statNeedsRepairRooms').innerText = needsRepair;
    if (document.getElementById('statClosedRooms')) {
        document.getElementById('statClosedRooms').innerText = closed;
    }

    // Filter rooms by search input
    const searchInput = document.getElementById('searchRoomInput');
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let displayedRooms = rooms;
    if (searchVal) {
        displayedRooms = rooms.filter(room =>
            room.number.toLowerCase().includes(searchVal) ||
            room.type.toLowerCase().includes(searchVal)
        );
    }

    // Group rooms by Floor
    const floorsMap = {};
    displayedRooms.forEach(room => {
        if (!floorsMap[room.floor]) floorsMap[room.floor] = [];
        floorsMap[room.floor].push(room);
    });

    // Sort Floors
    const sortedFloors = Object.keys(floorsMap).sort((a, b) => parseInt(a) - parseInt(b));

    const floorsContainer = document.getElementById('floorsContainer');
    if (total === 0) {
        floorsContainer.innerHTML = `
            <div class="py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400">
                <i data-lucide="hotel" class="w-12 h-12 text-slate-200 mx-auto mb-3"></i>
                <p class="font-bold text-sm">ไม่มีข้อมูลห้องพักในสาขานี้</p>
                <p class="text-[11px] text-slate-300 mt-1">คุณสามารถเพิ่มชั้นแรกได้โดยกดปุ่ม "เพิ่มชั้น"</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    if (displayedRooms.length === 0) {
        floorsContainer.innerHTML = `
            <div class="py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400">
                <i data-lucide="search" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                <p class="font-bold text-sm">ไม่พบห้องพักที่ตรงกับการค้นหา</p>
                <p class="text-[11px] text-slate-300 mt-1">ลองใช้คำค้นหาอื่น เช่น เลขห้อง หรือประเภทห้อง</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const canCreate = checkRoomCareAccess('create');
    const canDelete = checkRoomCareAccess('delete');

    floorsContainer.innerHTML = sortedFloors.map(floor => {
        const floorRooms = floorsMap[floor].sort((a, b) => a.number.localeCompare(b.number));
        const floorRoomCount = floorRooms.length;

        const addRoomBtnHtml = canCreate ? `
            <button onclick="openAddRoomToFloor('${floor}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black border border-indigo-100 transition-all active:scale-95 cursor-pointer flex items-center gap-1" title="เพิ่มห้องพักในชั้นนี้">
                <svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg> เพิ่มห้อง
            </button>
        ` : '';

        const deleteFloorBtnHtml = canDelete ? `
            <button onclick="deleteFloor('${floor}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl text-[10px] font-black border border-rose-100 transition-all active:scale-95 cursor-pointer flex items-center gap-1" title="ลบชั้นนี้ทั้งหมด">
                <svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg> ลบชั้น
            </button>
        ` : '';

        return `
            <div class="bg-sky-100 p-6 rounded-3xl border border-sky-200 shadow-sm space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-sky-200/60">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 bg-sky-500 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-sm shadow-sky-300">${floor}</span>
                        <h3 class="font-black text-sm text-slate-700 uppercase tracking-wider">ห้องพักบริเวณชั้น ${floor}</h3>
                        <span class="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full shadow-sm">${floorRoomCount} ห้อง</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        ${addRoomBtnHtml}
                        ${deleteFloorBtnHtml}
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    ${floorRooms.map(room => {
            let statusClass, roomNumberClass, statusLabel, subtext;
            const activeTickets = room.activeTickets || [];

            if (room.status === 'Available') {
                statusClass = 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100';
                roomNumberClass = 'text-emerald-900';
                statusLabel = 'ปกติ';
                subtext = `<p class="text-xs text-emerald-700 font-bold mt-1">✔ พร้อมใช้งาน</p>`;
            } else if (room.status === 'Needs Repair') {
                statusClass = 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-red-100';
                roomNumberClass = 'text-red-950 font-black';
                statusLabel = 'รอการแก้ไข';
                const firstT = activeTickets[0];
                const moreCount = activeTickets.length > 1 ? ` (+${activeTickets.length - 1})` : '';
                subtext = `<p class="text-xs text-red-750 font-bold truncate mt-1">⚠ ${firstT?.desc || 'พบจุดเสียหาย'}${moreCount}</p>`;
            } else {
                statusClass = 'bg-slate-100 border-slate-200 hover:border-slate-400 hover:shadow-slate-100';
                roomNumberClass = 'text-slate-700';
                statusLabel = 'ปิดปรับปรุง';
                subtext = `<p class="text-xs text-slate-600 font-bold mt-1">✖ ปิดปรับปรุงชั่วคราว</p>`;
            }

            let badgeColorClass = 'bg-emerald-200 text-emerald-800';
            if (room.status === 'Needs Repair') badgeColorClass = 'bg-red-200 text-red-800';
            else if (room.status === 'Closed') badgeColorClass = 'bg-slate-300 text-slate-700';

            const isUsed = room.usageStatus === 'InUse';
            const usageBadgeHtml = isUsed
                ? `<span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">กำลังใช้งาน</span>`
                : `<span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 border border-slate-200">ว่าง</span>`;

            return `
                            <div onclick="openRoomDetails('${room.id}')" class="room-card p-4 border-2 rounded-2xl cursor-pointer ${statusClass} flex flex-col justify-between shadow-sm min-h-[130px]">
                                <div class="flex justify-between items-start gap-1">
                                    <span class="text-sm font-black ${roomNumberClass} tracking-tight">#${room.number}</span>
                                    <div class="flex flex-wrap gap-1 justify-end">
                                        ${usageBadgeHtml}
                                        <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badgeColorClass}">${statusLabel}</span>
                                    </div>
                                </div>
                                <div>
                                    <span class="text-xs font-semibold ${roomNumberClass} opacity-60">${room.type}</span>
                                    ${subtext}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function renderLogsPanel() {
    const logsContainer = document.getElementById('logsContainer');

    // Retrieve filter values if inputs exist
    const searchText = document.getElementById('searchLogText') ? document.getElementById('searchLogText').value.trim().toLowerCase() : '';
    const actionFilter = document.getElementById('filterLogAction') ? document.getElementById('filterLogAction').value : 'All';

    // Filter logs
    let filteredLogs = logsDB;
    if (actionFilter !== 'All') {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
    }
    if (searchText) {
        filteredLogs = filteredLogs.filter(log =>
            log.text.toLowerCase().includes(searchText) ||
            log.user.toLowerCase().includes(searchText)
        );
    }

    document.getElementById('logBadgeCount').innerText = filteredLogs.length;

    if (filteredLogs.length === 0) {
        logsContainer.innerHTML = `
            <div class="py-10 text-center text-slate-400 text-xs font-medium space-y-2">
                <i data-lucide="database-backup" class="w-8 h-8 text-slate-300 mx-auto"></i>
                <p>ไม่พบรายการประวัติการบันทึก</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    logsContainer.innerHTML = filteredLogs.map(log => {
        const originalIndex = logsDB.indexOf(log);
        let badgeClass = 'bg-slate-50 text-slate-500';
        if (log.action === 'ตรวจเช็คระบบ') badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
        if (log.action === 'เปิดแจ้งซ่อม') badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
        if (log.action === 'เริ่มซ่อม') badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
        if (log.action === 'แก้ไขใบงาน') badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
        if (log.action === 'ซ่อมสำเร็จ') badgeClass = 'bg-blue-50 text-blue-600 border border-blue-100';
        if (log.action === 'เพิ่มสาขา') badgeClass = 'bg-teal-50 text-teal-600 border border-teal-100';
        if (log.action === 'เพิ่มห้องพัก') badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
        if (log.action === 'แก้ไขห้องพัก') badgeClass = 'bg-purple-50 text-purple-600 border border-purple-100';
        if (log.action === 'ลบห้องพัก') badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
        if (log.action === 'เพิ่มระบบใหม่') badgeClass = 'bg-pink-50 text-pink-600 border border-pink-100';
        if (log.action === 'แก้ไขสถานะ') badgeClass = 'bg-slate-50 text-slate-700 border border-slate-200';

        const timeStr = new Date(log.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return `
            <div onclick="openLogDetailModal(${originalIndex})" class="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 hover:border-indigo-200 hover:bg-indigo-50/10 cursor-pointer transition-all card-shadow">
                <div class="flex justify-between items-center">
                    <span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}">${log.action}</span>
                    <span class="text-[9px] text-slate-400 font-semibold">${timeStr}</span>
                </div>
                <p class="text-xs text-slate-700 font-bold leading-relaxed line-clamp-2">${escapeHTML(log.text)}</p>
                <p class="text-[9px] text-slate-400 font-medium flex items-center gap-1 justify-between">
                    <span class="flex items-center gap-1"><i data-lucide="user" class="w-3 h-3 text-slate-300"></i> ${escapeHTML(log.user)}</span>
                    <span class="text-[9px] font-bold text-indigo-600 hover:underline">คลิกดู &raquo;</span>
                </p>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Branch changed trigger
function branchChanged() {
    renderDashboard();
}
