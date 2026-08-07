// ============================================================
// rc-tickets.js — Repair/Edit Ticket + Category Management
// Now uses /api/room-care for all ticket mutations
// ============================================================

function openRepairModal() {
    if (!checkRoomCareAccess('create')) {
        notify.error('คุณไม่มีสิทธิ์ในการสร้างใบงานซ่อมแซม');
        return;
    }
    if (!selectedRoom) return;
    document.getElementById('repairRoomLabel').innerText = selectedRoom.number;
    document.getElementById('repairDescription').value = '';
    document.getElementById('repairCost').value = '0';

    document.getElementById('repairModal').classList.remove('hidden');
}

function closeRepairModal() {
    document.getElementById('repairModal').classList.add('hidden');
}

function setQuickDescription(text) {
    document.getElementById('repairDescription').value = text;
}

// Handle repair form submit (bound in rc-init.js)
async function handleRepairFormSubmit(e) {
    e.preventDefault();
    if (!selectedRoom) return;

    const category = document.getElementById('repairCategory').value;
    const desc = document.getElementById('repairDescription').value.trim();
    const priority = document.getElementById('repairPriority').value;
    const assignee = document.getElementById('repairAssignee').value;
    let cost = parseFloat(document.getElementById('repairCost').value);
    if (isNaN(cost) || cost < 0) cost = 0;

    const branchId = document.getElementById('branchSelect').value;

    Swal.fire({
        title: 'กำลังบันทึกใบงานซ่อม...',
        text: `กำลังสร้างบันทึกแจ้งซ่อมห้อง #${selectedRoom.number}...`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const ticket = await rcFetch('/api/room-care?action=add_ticket', {
            method: 'POST',
            body: JSON.stringify({
                room_id: selectedRoom.id,
                branch_id: branchId,
                desc,
                category,
                priority,
                assignee: assignee || null,
                cost
            })
        });

        const dispNo = ticket.ticket_no || ticket.ticketNo || (ticket.id ? '#' + ticket.id.toUpperCase() : '');
        await addActionLog('เปิดแจ้งซ่อม', `เปิดบันทึกแจ้งซ่อมใหม่ ${dispNo} ห้อง ${selectedRoom.number} - ปัญหา: ${desc} (ช่าง: ${assignee || 'รอช่างเข้าดู'})`);
        await loadBranchRooms(branchId);

        // Update selectedRoom reference
        selectedRoom = (roomsDB[branchId] || []).find(r => r.id === selectedRoom.id) || selectedRoom;

        closeRepairModal();
        openRoomDetails(selectedRoom.id);
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.close();
        notify.success('สร้างบันทึกใบแจ้งซ่อมห้องพักสำเร็จ!');
    } catch (err) {
        Swal.close();
        console.error('handleRepairFormSubmit:', err);
        notify.error('เกิดข้อผิดพลาดในการสร้างใบแจ้งซ่อม');
    }
}

// Interactive states: Start/Finish Jobs
async function startRepairJob(roomId, ticketId) {
    const branchId = document.getElementById('branchSelect').value;

    Swal.fire({
        title: 'กำลังเริ่มงานซ่อม...',
        text: 'กำลังเปลี่ยนสถานะใบงานเป็นกำลังซ่อมบำรุง...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const r = (roomsDB[branchId] || []).find(room => room.id === roomId);
        const t = r?.activeTickets?.find(ticket => ticket.id === ticketId);
        if (!r || !t) {
            Swal.close();
            return;
        }

        await rcFetch('/api/room-care?action=start_ticket', {
            method: 'PUT',
            body: JSON.stringify({ ticket_id: ticketId })
        });

        await addActionLog('เริ่มซ่อม', `ช่าง ${t.assignee || 'ช่างประจำ'} เริ่มต้นดำเนินการตรวจสอบซ่อมแซมห้อง ${r.number} สำหรับใบงาน #${t.id.toUpperCase()}`);
        await loadBranchRooms(branchId);
        selectedRoom = (roomsDB[branchId] || []).find(room => room.id === roomId) || selectedRoom;
        openRoomDetails(roomId);
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.close();
        notify.toast('เปลี่ยนสถานะใบงานเป็น: กำลังซ่อมบำรุง', 'info');
    } catch (err) {
        Swal.close();
        console.error('startRepairJob:', err);
        notify.error('เกิดข้อผิดพลาดในการเริ่มงานซ่อม');
    }
}

async function finishRepairJob(roomId, ticketId, closeNotes = 'ไม่มีหมายเหตุ') {
    const branchId = document.getElementById('branchSelect').value;
    try {
        const r = (roomsDB[branchId] || []).find(room => room.id === roomId);
        const t = r?.activeTickets?.find(ticket => ticket.id === ticketId);
        if (!r || !t) return;

        Swal.fire({
            title: 'กำลังปิดงานซ่อม...',
            text: `กำลังบันทึกการปิดงานซ่อมห้อง ${r.number}...`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
            didOpen: () => { Swal.showLoading(); }
        });

        await rcFetch('/api/room-care?action=finish_ticket', {
            method: 'PUT',
            body: JSON.stringify({ ticket_id: ticketId, room_id: roomId, close_notes: closeNotes })
        });

        await addActionLog('ซ่อมสำเร็จ', `ซ่อมเสร็จเรียบร้อยห้อง ${r.number} ปัญหา: "${t.desc}" (หมายเหตุ: "${closeNotes}") สำหรับใบงาน #${t.id.toUpperCase()}`);
        await loadBranchRooms(branchId);
        selectedRoom = (roomsDB[branchId] || []).find(room => room.id === roomId) || selectedRoom;
        openRoomDetails(roomId);
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.close();
        notify.success('บันทึกการปิดงานซ่อมแซมเสร็จสิ้น!');
    } catch (err) {
        Swal.close();
        console.error('finishRepairJob:', err);
        notify.error('เกิดข้อผิดพลาด');
    }
}

function confirmFinishRepairJob(roomId, ticketId) {
    if (!checkRoomCareAccess('edit')) {
        notify.error('คุณไม่มีสิทธิ์ในการปิดงานซ่อมแซม');
        return;
    }
    Swal.fire({
        title: 'ยืนยันการปิดงานซ่อม?',
        text: 'กรุณาระบุหมายเหตุการปิดงานซ่อมแซม (เช่น เปลี่ยนอะไหล่ใหม่แล้ว, ทำความสะอาดเสร็จสิ้น)',
        input: 'text',
        inputPlaceholder: 'ระบุหมายเหตุการปิดงานที่นี่...',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'ใช่, ปิดงานซ่อม',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        }
    }).then((res) => {
        if (res.isConfirmed) {
            const closeNotes = res.value ? res.value.trim() : 'ไม่มีหมายเหตุ';
            finishRepairJob(roomId, ticketId, closeNotes);
        }
    });
}

// ==========================================
// Edit Ticket & Extensible Systems
// ==========================================
function openEditTicketModal(roomId, ticketId) {
    if (!checkRoomCareAccess('edit')) {
        notify.error('คุณไม่มีสิทธิ์ในการแก้ไขใบงานซ่อมแซม');
        return;
    }
    const branchId = document.getElementById('branchSelect').value;
    const rooms = roomsDB[branchId] || [];
    const r = rooms.find(room => room.id === roomId);
    if (!r || !r.activeTickets) return;

    const t = r.activeTickets.find(ticket => ticket.id === ticketId);
    if (!t) return;

    // Set inputs
    document.getElementById('editTicketRoomId').value = roomId;
    document.getElementById('editTicketId').value = ticketId;
    document.getElementById('editTicketRoomLabel').innerText = r.number;
    document.getElementById('editTicketDescription').value = t.desc;
    document.getElementById('editTicketCost').value = t.cost;

    if (choiceEditCategory) {
        choiceEditCategory.setChoiceByValue(t.category);
    } else {
        document.getElementById('editTicketCategory').value = t.category;
    }

    if (choiceEditPriority) {
        choiceEditPriority.setChoiceByValue(t.priority);
    } else {
        document.getElementById('editTicketPriority').value = t.priority;
    }

    if (choiceEditAssignee) {
        choiceEditAssignee.setChoiceByValue(t.assignee || '');
    } else {
        document.getElementById('editTicketAssignee').value = t.assignee || '';
    }

    document.getElementById('editTicketModal').classList.remove('hidden');
}

function closeEditTicketModal() {
    document.getElementById('editTicketModal').classList.add('hidden');
}

// Handle edit ticket form submit (bound in rc-init.js)
async function handleEditTicketFormSubmit(e) {
    e.preventDefault();
    const roomId = document.getElementById('editTicketRoomId').value;
    const ticketId = document.getElementById('editTicketId').value;
    const branchId = document.getElementById('branchSelect').value;

    const desc = document.getElementById('editTicketDescription').value.trim();
    const category = document.getElementById('editTicketCategory').value;
    const priority = document.getElementById('editTicketPriority').value;
    const assignee = document.getElementById('editTicketAssignee').value || null;
    let cost = parseFloat(document.getElementById('editTicketCost').value);
    if (isNaN(cost) || cost < 0) cost = 0;

    Swal.fire({
        title: 'กำลังบันทึกการแก้ไข...',
        text: 'กำลังอัปเดตข้อมูลใบงานซ่อมแซม...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        await rcFetch('/api/room-care?action=update_ticket', {
            method: 'PUT',
            body: JSON.stringify({ ticket_id: ticketId, desc, category, priority, assignee, cost })
        });

        const r = (roomsDB[branchId] || []).find(room => room.id === roomId);
        await addActionLog('แก้ไขใบงาน', `แก้ไขข้อมูลใบแจ้งซ่อม #${ticketId.toUpperCase()} ห้อง ${r?.number || ''} - ปรับรายละเอียด: "${desc}" (ช่าง: ${assignee || 'รอช่างเข้าดู'})`);
        await loadBranchRooms(branchId);
        selectedRoom = (roomsDB[branchId] || []).find(room => room.id === roomId) || selectedRoom;
        closeEditTicketModal();
        openRoomDetails(roomId);
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.close();
        notify.success('แก้ไขข้อมูลใบงานซ่อมแซมสำเร็จ!');
    } catch (err) {
        Swal.close();
        console.error('handleEditTicketFormSubmit:', err);
        notify.error('เกิดข้อผิดพลาดในการแก้ไขใบงาน');
    }
}

// ==========================================
// Render & Manage Category Dropdowns
// ==========================================
function renderCategoryOptions() {
    // Populate filter repair category
    const filterEl = document.getElementById('filterRepairCategory');
    if (filterEl) {
        let filterHtml = '<option value="All">ทุกระบบ</option>';
        systemsList.forEach(sys => {
            const info = getCategoryDetails(sys);
            filterHtml += `<option value="${sys}">${info.thai || info.name}</option>`;
        });

        if (choiceFilterCategory) {
            choiceFilterCategory.destroy();
        }
        filterEl.innerHTML = filterHtml;
        if (typeof Choices !== 'undefined') {
            choiceFilterCategory = new Choices(filterEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
        }
    }

    // Populate repair form category select
    const repairEl = document.getElementById('repairCategory');
    if (repairEl) {
        let repairHtml = '';
        systemsList.forEach(sys => {
            const info = getCategoryDetails(sys);
            repairHtml += `<option value="${sys}">${info.thai || info.name}</option>`;
        });
        repairHtml += `<option value="ADD_NEW_SYSTEM" class="text-indigo-600 font-bold">+ เพิ่มระบบใหม่...</option>`;

        if (choiceCategory) {
            choiceCategory.destroy();
        }
        repairEl.innerHTML = repairHtml;
        if (typeof Choices !== 'undefined') {
            choiceCategory = new Choices(repairEl, { searchEnabled: false, itemSelectText: '', allowHTML: true });
        }
    }

    // Populate edit ticket form category select
    const editEl = document.getElementById('editTicketCategory');
    if (editEl) {
        let editHtml = '';
        systemsList.forEach(sys => {
            const info = getCategoryDetails(sys);
            editHtml += `<option value="${sys}">${info.thai || info.name}</option>`;
        });
        editHtml += `<option value="ADD_NEW_SYSTEM" class="text-indigo-600 font-bold">+ เพิ่มระบบใหม่...</option>`;

        if (choiceEditCategory) {
            choiceEditCategory.destroy();
        }
        editEl.innerHTML = editHtml;
        if (typeof Choices !== 'undefined') {
            choiceEditCategory = new Choices(editEl, { searchEnabled: false, itemSelectText: '', allowHTML: true });
        }
    }
}

async function addNewSystem(selectId) {
    Swal.fire({
        title: 'เพิ่มระบบการซ่อมบำรุงใหม่',
        text: 'กรุณากรอกชื่อระบบหรืออุปกรณ์ที่ต้องการเพิ่ม (ภาษาอังกฤษ เช่น Light, CCTV, Network)',
        input: 'text',
        inputPlaceholder: 'เช่น CCTV',
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#4f46e5',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        inputValidator: (value) => {
            if (!value) {
                return 'กรุณากรอกชื่อระบบ!';
            }
            const cleanVal = value.trim();
            if (systemsList.some(s => s.toLowerCase() === cleanVal.toLowerCase())) {
                return 'ระบบนี้มีอยู่แล้วในระบบ!';
            }
        },
        preConfirm: async (value) => {
            const cancelBtn = Swal.getCancelButton();
            if (cancelBtn) cancelBtn.style.display = 'none';
            Swal.showLoading();
            try {
                const newSys = value.trim();
                systemsList.push(newSys);
                await saveSystemsList();
                renderCategoryOptions();

                // Select the newly added system
                if (selectId === 'repairCategory' && choiceCategory) {
                    choiceCategory.setChoiceByValue(newSys);
                } else if (selectId === 'editTicketCategory' && choiceEditCategory) {
                    choiceEditCategory.setChoiceByValue(newSys);
                }

                await addActionLog('เพิ่มระบบใหม่', `เพิ่มระบบอุปกรณ์ใหม่ในระบบซ่อมบำรุง: ${newSys}`);
                notify.success(`เพิ่มระบบ ${newSys} เรียบร้อยแล้ว`);
                return true;
            } catch (err) {
                console.error('addNewSystem error:', err);
                notify.error('เกิดข้อผิดพลาดในการบันทึกระบบใหม่');
                return false;
            }
        }
    }).then((res) => {
        if (!res.isConfirmed) {
            // Reset selection to default (first item) if cancelled
            if (selectId === 'repairCategory' && choiceCategory) {
                choiceCategory.setChoiceByValue(systemsList[0]);
            } else if (selectId === 'editTicketCategory' && choiceEditCategory) {
                choiceEditCategory.setChoiceByValue(systemsList[0]);
            }
        }
    });
}

// ============================================================
// Incident Logging Handlers
// ============================================================
function openIncidentModal() {
    if (!checkRoomCareAccess('create')) {
        notify.error('คุณไม่มีสิทธิ์ในการบันทึกเหตุการณ์');
        return;
    }
    if (!selectedRoom) return;
    document.getElementById('incidentRoomLabel').innerText = selectedRoom.number;
    document.getElementById('incidentTitle').value = '';
    document.getElementById('incidentDetail').value = '';
    if (document.getElementById('incidentCategory')) document.getElementById('incidentCategory').value = 'General';
    if (document.getElementById('incidentSeverity')) document.getElementById('incidentSeverity').value = 'Normal';

    document.getElementById('incidentModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeIncidentModal() {
    document.getElementById('incidentModal').classList.add('hidden');
}

function setQuickIncidentTitle(text) {
    document.getElementById('incidentTitle').value = text;
}

async function handleIncidentFormSubmit(e) {
    e.preventDefault();
    if (!selectedRoom) return;

    const title = document.getElementById('incidentTitle').value.trim();
    const detail = document.getElementById('incidentDetail').value.trim();
    const category = document.getElementById('incidentCategory').value;
    const severity = document.getElementById('incidentSeverity').value;
    const branchId = document.getElementById('branchSelect').value;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!title) {
        notify.error('กรุณาระบุหัวข้อเหตุการณ์');
        return;
    }

    Swal.fire({
        title: 'กำลังบันทึกเหตุการณ์...',
        text: `กำลังบันทึกเหตุการณ์สำหรับห้อง #${selectedRoom.number}...`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        await rcFetch('/api/room-care?action=add_incident', {
            method: 'POST',
            body: JSON.stringify({
                branch_id: branchId,
                room_id: selectedRoom.id,
                title,
                detail,
                category,
                severity,
                reporter: user.name || 'System User'
            })
        });

        await loadBranchRooms(branchId);
        selectedRoom = (roomsDB[branchId] || []).find(r => r.id === selectedRoom.id) || selectedRoom;

        closeIncidentModal();
        openRoomDetails(selectedRoom.id);
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.close();
        notify.success('บันทึกเหตุการณ์สำเร็จ!');
    } catch (err) {
        Swal.close();
        console.error('handleIncidentFormSubmit:', err);
        notify.error('เกิดข้อผิดพลาดในการบันทึกเหตุการณ์');
    }
}
