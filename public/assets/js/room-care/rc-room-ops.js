// ============================================================
// rc-room-ops.js — Add/Edit/Delete Room Operations
// Now uses /api/room-care for all room mutations
// ============================================================

// ==========================================
// Add Single Room to Floor
// ==========================================
function openAddRoomToFloor(floor) {
    if (!checkRoomCareAccess('create')) {
        notify.error('คุณไม่มีสิทธิ์ในการเพิ่มห้องพัก');
        return;
    }
    const branchId = document.getElementById('branchSelect').value;
    const branchObj = branchesDB.find(b => b.id === branchId);
    const branchName = branchObj?.name || 'โรงแรม';

    document.getElementById('roomFormMode').value = 'create';
    document.getElementById('editRoomId').value = '';
    document.getElementById('roomFormBranch').value = branchId;
    document.getElementById('roomFormFloor').value = floor;
    document.getElementById('roomModalBranchFloor').innerText = `${branchName} • ชั้น ${floor}`;
    document.getElementById('roomModalTitle').innerText = `เพิ่มห้องพัก (ชั้น ${floor})`;
    document.getElementById('roomFormNumber').value = '';
    if (choiceFormType) {
        choiceFormType.setChoiceByValue('Standard');
    } else {
        document.getElementById('roomFormType').value = 'Standard';
    }
    document.getElementById('roomModal').classList.remove('hidden');
    lucide.createIcons();
}

// ==========================================
// Edit Room Modal (from room detail drawer)
// ==========================================
function openRoomModal(mode = 'create', roomId = '') {
    if (mode === 'create') {
        if (!checkRoomCareAccess('create')) {
            notify.error('คุณไม่มีสิทธิ์ในการเพิ่มห้องพัก');
            return;
        }
        openFloorModal();
        return;
    }

    // EDIT MODE
    if (!checkRoomCareAccess('edit')) {
        notify.error('คุณไม่มีสิทธิ์ในการแก้ไขห้องพัก');
        return;
    }

    let foundRoom = null;
    let foundBranchId = null;
    for (const bId in roomsDB) {
        const r = roomsDB[bId].find(rm => rm.id === roomId);
        if (r) { foundRoom = r; foundBranchId = bId; break; }
    }
    if (!foundRoom) return;

    const branchObj = branchesDB.find(b => b.id === foundBranchId);
    const branchName = branchObj?.name || 'โรงแรม';

    document.getElementById('roomFormMode').value = 'edit';
    document.getElementById('editRoomId').value = roomId;
    document.getElementById('roomFormBranch').value = foundBranchId;
    document.getElementById('roomFormFloor').value = foundRoom.floor;
    document.getElementById('roomModalBranchFloor').innerText = `${branchName} • ชั้น ${foundRoom.floor}`;
    document.getElementById('roomModalTitle').innerText = 'แก้ไขข้อมูลห้องพัก';
    document.getElementById('roomFormNumber').value = foundRoom.number;

    if (choiceFormType) {
        choiceFormType.setChoiceByValue(foundRoom.type);
    } else {
        document.getElementById('roomFormType').value = foundRoom.type;
    }

    document.getElementById('roomModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeRoomModal() {
    document.getElementById('roomModal').classList.add('hidden');
}

// Delete entire floor
async function deleteFloor(floor) {
    if (!checkRoomCareAccess('delete')) {
        notify.error('คุณไม่มีสิทธิ์ในการลบชั้น');
        return;
    }
    const branchId = document.getElementById('branchSelect').value;
    const branchObj = branchesDB.find(b => b.id === branchId);
    const branchName = branchObj?.name || 'โรงแรม';
    const floorRooms = (roomsDB[branchId] || []).filter(r => r.floor === String(floor));

    Swal.fire({
        title: `ลบชั้น ${floor} ทั้งหมด?`,
        text: `จะลบห้องพักทั้ง ${floorRooms.length} ห้องในชั้น ${floor} ของสาขา "${branchName}" ออกจากระบบถาวร`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'ลบชั้นนี้',
        cancelButtonText: 'ยกเลิก',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        },
        preConfirm: async () => {
            const cancelBtn = Swal.getCancelButton();
            if (cancelBtn) cancelBtn.style.display = 'none';
            Swal.showLoading();
            try {
                await rcFetch(`/api/room-care?action=delete_floor&branch_id=${branchId}&floor=${floor}`, { method: 'DELETE' });
                await addActionLog('ลบห้องพัก', `ลบชั้น ${floor} ทั้งหมด (${floorRooms.length} ห้อง) จากสาขา ${branchName}`);
                await loadBranchRooms(branchId);
                renderDashboard();
                notify.success(`ลบชั้น ${floor} ออกจากระบบสำเร็จ!`);
                return true;
            } catch (err) {
                console.error('deleteFloor:', err);
                notify.error('เกิดข้อผิดพลาดในการลบชั้น');
                return false;
            }
        }
    });
}

// Handle room form submit (bound in rc-init.js)
async function handleRoomFormSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById('roomFormMode').value;
    const roomId = document.getElementById('editRoomId').value;

    const targetBranchId = document.getElementById('roomFormBranch').value;
    const roomNumber = document.getElementById('roomFormNumber').value.trim();
    const floor = document.getElementById('roomFormFloor').value.trim();
    const roomType = document.getElementById('roomFormType').value;

    // Validation
    if (!roomNumber || !floor) {
        notify.error('กรุณากรอกข้อมูลห้องพักให้ครบถ้วน!');
        return;
    }

    const targetBranchName = branchesDB.find(b => b.id === targetBranchId)?.name || 'โรงแรม';

    if (mode === 'create') {
        // Check if Room Number exists locally first
        const exists = (roomsDB[targetBranchId] || []).find(r => r.number === roomNumber);
        if (exists) {
            Swal.fire({
                icon: 'error',
                title: 'หมายเลขห้องซ้ำ!',
                text: `มีห้องเลขที่ ${roomNumber} อยู่ในสาขา "${targetBranchName}" เรียบร้อยแล้ว`,
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        Swal.fire({
            title: 'กำลังเพิ่มห้องพัก...',
            text: `กำลังสร้างห้องพัก #${roomNumber} ชั้น ${floor}...`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            await rcFetch('/api/room-care?action=add_room', {
                method: 'POST',
                body: JSON.stringify({ branch_id: targetBranchId, number: roomNumber, type: roomType, floor })
            });
            await addActionLog('เพิ่มห้องพัก', `เพิ่มห้องพักใหม่ #${roomNumber} ชั้น ${floor} ประเภท ${roomType} (สาขา ${targetBranchName})`);
            await loadBranchRooms(targetBranchId);
            closeRoomModal();
            renderDashboard();
            Swal.close();
            notify.success(`เพิ่มห้องพัก #${roomNumber} สำเร็จ!`);
        } catch (err) {
            Swal.close();
            console.error('handleRoomFormSubmit create:', err);
            notify.error('เกิดข้อผิดพลาดในการเพิ่มห้องพัก');
        }

    } else {
        // EDIT MODE
        let oldRoom = null;
        for (const bId in roomsDB) {
            const r = roomsDB[bId].find(rm => rm.id === roomId);
            if (r) { oldRoom = r; break; }
        }

        if (!oldRoom) {
            notify.error('ไม่พบข้อมูลห้องพักที่ต้องการแก้ไข');
            return;
        }

        // Check duplicates if number changed
        if (oldRoom.number !== roomNumber) {
            const exists = (roomsDB[targetBranchId] || []).find(r => r.number === roomNumber && r.id !== roomId);
            if (exists) {
                Swal.fire({
                    icon: 'error',
                    title: 'หมายเลขห้องซ้ำ!',
                    text: `มีห้องเลขที่ ${roomNumber} อยู่ในสาขา "${targetBranchName}" เรียบร้อยแล้ว`,
                    confirmButtonColor: '#4f46e5'
                });
                return;
            }
        }

        const logOldText = `ห้อง ${oldRoom.number} (ชั้น ${oldRoom.floor}, ${oldRoom.type})`;

        Swal.fire({
            title: 'กำลังบันทึกการแก้ไข...',
            text: `กำลังอัปเดตข้อมูลห้อง #${roomNumber}...`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl border-0 shadow-2xl' },
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            await rcFetch('/api/room-care?action=update_room', {
                method: 'PUT',
                body: JSON.stringify({ room_id: roomId, number: roomNumber, type: roomType })
            });
            await addActionLog('แก้ไขห้องพัก', `แก้ไขข้อมูล ${logOldText} -> เป็นห้อง #${roomNumber} ชั้น ${floor} ประเภท ${roomType} (สาขา ${targetBranchName})`);
            await loadBranchRooms(targetBranchId);
            closeRoomModal();
            closeRoomDetailsModal();
            renderDashboard();
            Swal.close();
            notify.success(`แก้ไขข้อมูลห้องพักสำเร็จ!`);
        } catch (err) {
            Swal.close();
            console.error('handleRoomFormSubmit edit:', err);
            notify.error('เกิดข้อผิดพลาดในการแก้ไขห้องพัก');
        }
    }
}

// Triggered inside Room Details drawer
function editCurrentRoom() {
    if (!checkRoomCareAccess('edit')) {
        notify.error('คุณไม่มีสิทธิ์ในการแก้ไขห้องพัก');
        return;
    }
    if (!selectedRoom) return;
    openRoomModal('edit', selectedRoom.id);
}

async function deleteCurrentRoom() {
    if (!checkRoomCareAccess('delete')) {
        notify.error('คุณไม่มีสิทธิ์ในการลบห้องพัก');
        return;
    }
    if (!selectedRoom) return;

    Swal.fire({
        title: 'ยืนยันการลบห้องพัก?',
        text: `คุณต้องการลบห้องพัก #${selectedRoom.number} ออกจากระบบถาวรหรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'ลบห้องพัก',
        cancelButtonText: 'ยกเลิก',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        },
        preConfirm: async () => {
            const cancelBtn = Swal.getCancelButton();
            if (cancelBtn) cancelBtn.style.display = 'none';
            Swal.showLoading();
            const branchId = document.getElementById('branchSelect').value;
            const branchName = branchesDB.find(b => b.id === branchId)?.name || '';

            try {
                await rcFetch(`/api/room-care?action=delete_room&room_id=${selectedRoom.id}`, { method: 'DELETE' });
                await addActionLog('ลบห้องพัก', `ลบห้องพัก #${selectedRoom.number} ชั้น ${selectedRoom.floor} ออกจากสารบบสาขา ${branchName}`);
                await loadBranchRooms(branchId);
                closeRoomDetailsModal();
                renderDashboard();
                notify.success('ลบห้องพักออกจากระบบสำเร็จ!');
                return true;
            } catch (err) {
                console.error('deleteCurrentRoom:', err);
                notify.error('เกิดข้อผิดพลาดในการลบห้องพัก');
                return false;
            }
        }
    });
}
