// ============================================================
// rc-status.js — Status Rooms List Modal + Change Status Modal
// ============================================================

// ==========================================
// Room Status Summary Detail List Modal
// ==========================================
function showStatusRoomsModal(status) {
    const branchId = document.getElementById('branchSelect').value;
    const rooms = roomsDB[branchId] || [];

    let filteredRooms = [];
    let titleText = '';
    let subText = '';

    const branchName = branchesDB.find(b => b.id === branchId)?.name || 'โรงแรม';

    if (status === 'All') {
        filteredRooms = rooms;
        titleText = 'ห้องพักทั้งหมด';
        subText = `แสดงห้องพักทั้งหมดของ ${branchName} (รวม ${filteredRooms.length} ห้อง)`;
    } else if (status === 'Available') {
        filteredRooms = rooms.filter(r => r.status === 'Available');
        titleText = 'ห้องพักสถานะ: ปกติ';
        subText = `แสดงห้องพักที่พร้อมใช้งานของ ${branchName} (รวม ${filteredRooms.length} ห้อง)`;
    } else if (status === 'Needs Repair') {
        filteredRooms = rooms.filter(r => r.status === 'Needs Repair');
        titleText = 'ห้องพักสถานะ: รอการแก้ไข';
        subText = `แสดงห้องพักที่รอการแก้ไขของ ${branchName} (รวม ${filteredRooms.length} ห้อง)`;
    } else if (status === 'Closed') {
        filteredRooms = rooms.filter(r => r.status === 'Closed');
        titleText = 'ห้องพักสถานะ: ปิดปรับปรุง';
        subText = `แสดงห้องพักที่อยู่ระหว่างปิดปรับปรุงชั่วคราวของ ${branchName} (รวม ${filteredRooms.length} ห้อง)`;
    }

    document.getElementById('statusRoomsModalTitle').innerText = titleText;
    document.getElementById('statusRoomsModalSub').innerText = subText;

    // เรียงลำดับหมายเลขห้องจากน้อยไปมาก (301, 402, 502, 503...)
    filteredRooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

    const container = document.getElementById('statusRoomsList');

    if (filteredRooms.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <i data-lucide="hotel" class="w-10 h-10 text-slate-300 mx-auto"></i>
                <p>ไม่พบห้องพักในสถานะนี้</p>
            </div>
        `;
        document.getElementById('statusRoomsModal').classList.remove('hidden');
        lucide.createIcons();
        return;
    }

    container.innerHTML = filteredRooms.map(r => {
        let badgeClass = 'bg-emerald-100 text-emerald-700';
        let statusLabel = 'ปกติ';
        let subLabel = '✔ พร้อมใช้งาน';

        const activeTickets = r.activeTickets || [];

        if (r.status === 'Needs Repair') {
            badgeClass = 'bg-red-100 text-red-700 border border-red-200';
            statusLabel = 'รอการแก้ไข';
            const firstT = activeTickets[0];
            const moreCount = activeTickets.length > 1 ? ` (+${activeTickets.length - 1})` : '';
            subLabel = `⚠ ${firstT?.desc || 'พบจุดเสียหาย'}${moreCount}`;
        } else if (r.status === 'Closed') {
            badgeClass = 'bg-slate-200 text-slate-700';
            statusLabel = 'ปิดปรับปรุง';
            subLabel = '✖ ปิดปรับปรุงชั่วคราว';
        }

        return `
            <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all shadow-sm">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-black text-slate-800">#${r.number}</span>
                        <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badgeClass}">${statusLabel}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">ชั้น ${r.floor} • ${r.type}</p>
                    <p class="text-[11px] text-slate-600 font-semibold truncate max-w-[220px] sm:max-w-[300px]">${subLabel}</p>
                </div>
                <button onclick="viewRoomFromStatusList('${r.id}')" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm shadow-indigo-600/10">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i> ดูห้องพัก
                </button>
            </div>
        `;
    }).join('');

    document.getElementById('statusRoomsModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeStatusRoomsModal() {
    document.getElementById('statusRoomsModal').classList.add('hidden');
}

function viewRoomFromStatusList(roomId) {
    closeStatusRoomsModal();
    openRoomDetails(roomId);
}

// ==========================================
// Change Room Status Modal
// ==========================================
function openChangeStatusModal() {
    if (!selectedRoom) return;
    const currentStatus = selectedRoom.status;
    const statusLabels = {
        'Available': 'ปกติ (Available)',
        'Needs Repair': 'รอการซ่อมแซม (Needs Repair)',
        'Closed': 'ปิดปรับปรุง (Closed)'
    };

    const optionsHtml = Object.entries(statusLabels).map(([val, label]) =>
        `<option value="${val}" ${val === currentStatus ? 'selected' : ''}>&nbsp;&nbsp;${label}</option>`
    ).join('');

    let swalChoicesInstance = null;
    Swal.fire({
        title: `แก้ไขสถานะห้อง ${selectedRoom.number}`,
        html: `
            <p class="text-xs text-slate-500 mb-4 font-bold">เลือกสถานะใหม่สำหรับห้องพัก #${selectedRoom.number}</p>
            <select id="swal-status-select" class="w-full">
                ${optionsHtml}
            </select>
            <p class="text-[11px] text-slate-400 mt-4 text-left font-bold">หมายเหตุ: การแก้ไขสถานะด้วยตนเองจะไม่ปิดใบงานซ่อมที่ค้างอยู่</p>`,
        showCancelButton: true,
        confirmButtonText: 'บันทึกสถานะ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#e2e8f0',
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl overflow-visible',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600',
            htmlContainer: 'text-left overflow-visible'
        },
        didOpen: () => {
            const selectEl = document.getElementById('swal-status-select');
            if (selectEl && typeof Choices !== 'undefined') {
                swalChoicesInstance = new Choices(selectEl, { searchEnabled: false, itemSelectText: '', allowHTML: true });
            }
        },
        preConfirm: () => {
            if (swalChoicesInstance) {
                return swalChoicesInstance.getValue(true);
            }
            return document.getElementById('swal-status-select').value;
        }
    }).then(async res => {
        if (res.isConfirmed) {
            const newStatus = res.value;
            const oldStatus = selectedRoom.status;
            if (newStatus === oldStatus) return;

            const branchId = document.getElementById('branchSelect')?.value;

            try {
                let details = selectedRoom.details || {};
                if (newStatus === 'Available' || newStatus === 'Closed') {
                    details = {};
                    systemsList.forEach(sys => {
                        const sysKey = sys.toLowerCase().replace(/\s+/g, '_');
                        details[sysKey] = 'Normal';
                    });
                }

                const user = JSON.parse(localStorage.getItem('user') || '{}');

                await rcFetch('/api/room-care?action=update_room_inspection', {
                    method: 'PUT',
                    body: JSON.stringify({
                        room_id: selectedRoom.id,
                        status: newStatus,
                        details: details,
                        inspector: user.name || 'System User'
                    })
                });

                const statusThai = { 'Available': 'ปกติ', 'Needs Repair': 'รอการแก้ไข', 'Closed': 'ปิดปรับปรุง' };
                await addActionLog('แก้ไขสถานะ', `เปลี่ยนสถานะห้อง ${selectedRoom.number} จาก "${statusThai[oldStatus] || oldStatus}" เป็น "${statusThai[newStatus] || newStatus}"`);

                if (branchId) {
                    await loadBranchRooms(branchId);
                    selectedRoom = (roomsDB[branchId] || []).find(r => r.id === selectedRoom.id) || selectedRoom;
                }

                openRoomDetails(selectedRoom.id);
                if (typeof renderDashboard === 'function') renderDashboard();
                notify.success(`อัปเดตสถานะห้อง ${selectedRoom.number} เป็น "${statusThai[newStatus] || newStatus}" เรียบร้อย!`);
            } catch (err) {
                console.error('openChangeStatusModal error:', err);
                notify.error('เกิดข้อผิดพลาดในการอัปเดตสถานะห้องพัก');
            }
        }
    });
}
