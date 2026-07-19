// ============================================================
// rc-branch.js — Branch & Floor Management
// Branches come from the main 'branches' table (read-only for RoomCare).
// Floor/room creation now goes to /api/room-care.
// ============================================================

// ==========================================
// Add New Branch (disabled — branches managed via main system)
// ==========================================
function addNewBranch() {
    Swal.fire({
        icon: 'info',
        title: 'การจัดการสาขา',
        text: 'ข้อมูลสาขาโรงแรมจัดการผ่านระบบหลัก IT Management กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มสาขาใหม่',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'รับทราบ',
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
    });
}

function deleteCurrentBranch() {
    Swal.fire({
        icon: 'info',
        title: 'การจัดการสาขา',
        text: 'ข้อมูลสาขาโรงแรมจัดการผ่านระบบหลัก IT Management กรุณาติดต่อผู้ดูแลระบบ',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'รับทราบ',
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
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
