// ============================================================
// rc-branch.js — Branch & Floor Management
// Branches come from the main 'branches' table (read-only for RoomCare).
// Floor/room creation now goes to /api/room-care.
// ============================================================

// ==========================================
// Add New Branch
// ==========================================
function addNewBranch() {
    if (!checkRoomCareAccess('create')) {
        notify.error('คุณไม่มีสิทธิ์ในการเพิ่มสาขา');
        return;
    }

    Swal.fire({
        title: 'เพิ่มสาขาโรงแรมใหม่',
        input: 'text',
        inputLabel: 'ชื่อสาขาโรงแรม (เช่น สาขา หัวหิน)',
        inputPlaceholder: 'กรอกชื่อสาขาโรงแรม...',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) {
                return 'กรุณาระบุชื่อสาขาโรงแรม!';
            }
            const cleanVal = value.trim();
            const exists = branchesDB.find(b => b.name.toLowerCase() === cleanVal.toLowerCase() || b.name.toLowerCase() === ('สาขา ' + cleanVal).toLowerCase());
            if (exists) {
                return 'ชื่อสาขานี้มีในระบบแล้ว!';
            }
        },
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            let branchName = result.value.trim();
            if (!branchName.startsWith('สาขา')) {
                branchName = 'สาขา ' + branchName;
            }

            try {
                // 1. Post to main branches API
                await apiFetch('/api/branches', {
                    method: 'POST',
                    body: JSON.stringify({ name: branchName, location: '' })
                });

                // 2. Fetch updated branches from room-care settings
                const updatedBranches = await apiFetch('/api/room-care?action=branches');
                branchesDB = updatedBranches || [];

                // 3. Find the newly created branch ID
                const newBranchObj = branchesDB.find(b => b.name.toLowerCase() === branchName.toLowerCase());
                const newBranchId = newBranchObj ? newBranchObj.id : (branchesDB[branchesDB.length - 1]?.id || null);

                await addActionLog('เพิ่มสาขา', `เพิ่มสาขาโรงแรมใหม่: "${branchName}"`);
                await rebuildBranchSelects(newBranchId);
                notify.success(`บันทึกสาขา "${branchName}" สำเร็จ!`);
            } catch (err) {
                console.error('addNewBranch failed:', err);
                notify.error('ไม่สามารถเพิ่มสาขาได้: ' + (err.message || 'เกิดข้อผิดพลาด หรือคุณไม่มีสิทธิ์ผู้ดูแลระบบ (Admin)'));
            }
        }
    });
}

// ==========================================
// Delete Current Branch
// ==========================================
function deleteCurrentBranch() {
    if (!checkRoomCareAccess('delete')) {
        notify.error('คุณไม่มีสิทธิ์ในการลบสาขา');
        return;
    }

    const branchSelect = document.getElementById('branchSelect');
    const branchId = branchSelect.value;

    if (branchesDB.length <= 1) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่สามารถลบสาขาได้',
            text: 'ระบบจำเป็นต้องมีอย่างน้อย 1 สาขา ไม่สามารถลบสาขาสุดท้ายได้',
            confirmButtonColor: '#4f46e5',
            customClass: { popup: 'rounded-3xl border-0 shadow-2xl', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
        });
        return;
    }

    const branchObj = branchesDB.find(b => b.id === branchId);
    const branchName = branchObj ? branchObj.name : 'สาขานี้';

    Swal.fire({
        title: `ยืนยันการลบ ${branchName}?`,
        text: 'ห้องพัก ข้อมูลตรวจเช็ค และใบงานแจ้งซ่อมทั้งหมดของสาขานี้จะถูกลบออกจากระบบอย่างถาวรและไม่สามารถเรียกคืนได้',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'ใช่, ลบสาขานี้',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        }
    }).then(async (res) => {
        if (res.isConfirmed) {
            try {
                // 1. Delete associated rooms/logs/tickets from room-care tables first
                await apiFetch(`/api/room-care?action=delete_branch&branch_id=${branchId}`, {
                    method: 'DELETE'
                });

                // 2. Delete branch from main branches API
                await apiFetch(`/api/branches?action=delete&id=${branchId}`, {
                    method: 'POST'
                });

                await addActionLog('ลบสาขา', `ลบสาขาโรงแรม: "${branchName}" และข้อมูลห้องพักที่เกี่ยวข้องทั้งหมด`);

                // 3. Fetch updated branches list
                const updatedBranches = await apiFetch('/api/room-care?action=branches');
                branchesDB = updatedBranches || [];

                // 4. Select first available branch
                const nextBranchId = branchesDB[0]?.id || null;
                await rebuildBranchSelects(nextBranchId);

                notify.success(`ลบสาขา "${branchName}" เรียบร้อยแล้ว!`);
            } catch (err) {
                console.error('deleteCurrentBranch failed:', err);
                notify.error('ไม่สามารถลบสาขาได้: ' + (err.message || 'เกิดข้อผิดพลาด หรือคุณไม่มีสิทธิ์ผู้ดูแลระบบ (Admin)'));
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────
// Rebuild branch selector and reload rooms for selected branch
// ─────────────────────────────────────────────────────────────
async function rebuildBranchSelects(selectedBranchId = null) {
    const selectEl = document.getElementById('branchSelect');
    if (!selectEl) return;

    const currentSelected = selectedBranchId || selectEl.value || (branchesDB[0]?.id ?? '');

    // 1. Destroy Choices
    if (choiceBranch) { try { choiceBranch.destroy(); } catch (e) { } choiceBranch = null; }

    // 2. Re-render Select
    const optionsHtml = branchesDB.map(b =>
        `<option value="${b.id}" ${b.id === currentSelected ? 'selected' : ''}>${b.name}</option>`
    ).join('');
    selectEl.innerHTML = optionsHtml;

    // 3. Rebuild Choices.js
    if (typeof Choices !== 'undefined') {
        choiceBranch = new Choices(selectEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
    }

    // 4. Load rooms for selected branch (from API if not yet cached)
    if (currentSelected && !roomsDB[currentSelected]) {
        await loadBranchRooms(currentSelected);
    }

    // 5. Update view
    renderDashboard();
    updateActionButtonsVisibility();
}

// ==========================================
// Add Floor Modal
// ==========================================
function openFloorModal() {
    if (!checkRoomCareAccess('create')) {
        notify.error('คุณไม่มีสิทธิ์ในการเพิ่มชั้น');
        return;
    }
    const branchId = document.getElementById('branchSelect').value;
    const branchObj = branchesDB.find(b => b.id === branchId);
    document.getElementById('floorModalBranchName').innerText = branchObj?.name || 'โรงแรม';
    document.getElementById('floorFormNumber').value = '';
    document.getElementById('floorFormRoomCount').value = '';
    if (choiceFloorRoomType) {
        choiceFloorRoomType.setChoiceByValue('Standard');
    } else {
        document.getElementById('floorFormRoomType').value = 'Standard';
    }
    document.getElementById('floorModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeFloorModal() {
    document.getElementById('floorModal').classList.add('hidden');
}

// Handle floor form submit (bound in rc-init.js)
async function handleFloorFormSubmit(e) {
    e.preventDefault();
    const branchId = document.getElementById('branchSelect').value;
    const branchObj = branchesDB.find(b => b.id === branchId);
    const branchName = branchObj?.name || 'โรงแรม';

    const floorNum = parseInt(document.getElementById('floorFormNumber').value);
    const roomCount = parseInt(document.getElementById('floorFormRoomCount').value);
    const roomType = document.getElementById('floorFormRoomType').value;

    if (!floorNum || floorNum < 1 || !roomCount || roomCount < 1) {
        notify.error('กรุณากรอกข้อมูลให้ถูกต้อง!');
        return;
    }

    // Check if floor already exists locally
    const existingRooms = roomsDB[branchId] || [];
    const floorStr = String(floorNum);
    const floorExists = existingRooms.some(r => r.floor === floorStr);
    if (floorExists) {
        Swal.fire({
            icon: 'warning',
            title: `ชั้น ${floorNum} มีอยู่แล้ว!`,
            text: `สาขา "${branchName}" มีชั้น ${floorNum} อยู่ในระบบแล้ว กรุณาเลือกชั้นอื่น หรือกดปุ่ม "เพิ่มห้อง" ที่ชั้นนั้นเพื่อเพิ่มห้องพักเพิ่มเติม`,
            confirmButtonColor: '#4f46e5',
            customClass: { popup: 'rounded-3xl border-0 shadow-2xl', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
        });
        return;
    }

    try {
        const result = await apiFetch('/api/room-care?action=add_floor', {
            method: 'POST',
            body: JSON.stringify({
                branch_id: branchId,
                floor: floorStr,
                room_count: roomCount,
                room_type: roomType
            })
        });

        await addActionLog('เพิ่มห้องพัก', `เพิ่มชั้น ${floorNum} (${result.created?.length || roomCount} ห้อง) ในสาขา ${branchName}: ${(result.created || []).slice(0, 5).join(', ')}`);
        await loadBranchRooms(branchId);
        closeFloorModal();
        renderDashboard();
        notify.success(`สร้างชั้น ${floorNum} จำนวน ${result.created?.length || roomCount} ห้องสำเร็จ!`);
    } catch (err) {
        console.error('handleFloorFormSubmit:', err);
        notify.error('เกิดข้อผิดพลาดในการเพิ่มชั้น');
    }
}
