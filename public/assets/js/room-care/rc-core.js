// ============================================================
// rc-core.js — Global State Variables, Helpers & DB functions
// Migrated to use Neon PostgreSQL via /api/room-care
// ============================================================

// --- Global state variables ---
let roomsDB = {};       // { [branchId]: Room[] }
let branchesDB = [];    // Branch[]
let logsDB = [];        // Log[]
let systemsList = [];
let roomTypesList = [];
let assigneesList = [];

let choiceBranch = null;
let choicePriority = null;
let choiceAssignee = null;
let choiceCategory = null;
let choiceEditPriority = null;
let choiceEditAssignee = null;
let choiceFloorRoomType = null;
let choiceFormType = null;
let choiceEditCategory = null;
let choiceFilterCategory = null;

// Selected room for detail modal context
let selectedRoom = null;

// Custom Checklist state for active inspection modal
let activeChecklistState = {
    electrical: 'Normal',
    ac: 'Normal',
    plumbing: 'Normal',
    furniture: 'Normal',
    appliances: 'Normal'
};

// --- Category Details Helper ---
function getCategoryDetails(sys) {
    const thaiMapping = {
        'Electrical': { name: 'Electrical', thai: 'ระบบไฟฟ้า (Electrical)', color: 'text-amber-500', icon: 'zap' },
        'AC': { name: 'AC', thai: 'ระบบปรับอากาศ (AC)', color: 'text-blue-500', icon: 'wind' },
        'Plumbing': { name: 'Plumbing', thai: 'ระบบประปา/สุขภัณฑ์ (Plumbing)', color: 'text-teal-500', icon: 'droplet' },
        'Furniture': { name: 'Furniture', thai: 'เฟอร์นิเจอร์ (Furniture)', color: 'text-indigo-500', icon: 'sofa' },
        'Appliances': { name: 'Appliances', thai: 'เครื่องใช้ไฟฟ้า (Appliances)', color: 'text-purple-500', icon: 'tv' },
        'Other': { name: 'Other', thai: 'อื่นๆ (Other)', color: 'text-slate-400', icon: 'settings' }
    };
    if (thaiMapping[sys]) {
        return thaiMapping[sys];
    }
    return {
        name: sys,
        thai: sys,
        color: 'text-slate-400',
        icon: 'settings'
    };
}

// ─────────────────────────────────────────────────────────────
// Helper: map API room rows (snake_case + JSONB) to frontend format
// ─────────────────────────────────────────────────────────────
function mapRoomFromApi(apiRoom) {
    return {
        id: apiRoom.id,
        branch_id: apiRoom.branch_id,
        number: apiRoom.number,
        type: apiRoom.type,
        floor: apiRoom.floor,
        status: apiRoom.status,
        lastInspected: apiRoom.last_inspected || null,
        inspector: apiRoom.inspector || '',
        details: apiRoom.details || {},
        activeTickets: (apiRoom.active_tickets || []).map(mapTicketFromApi),
        repairHistory: (apiRoom.repair_history || []).map(mapTicketFromApi),
    };
}

function mapTicketFromApi(t) {
    if (!t) return t;
    return {
        id: t.id,
        room_id: t.room_id,
        desc: t.desc,
        category: t.category,
        priority: t.priority,
        assignee: t.assignee || null,
        cost: parseFloat(t.cost || 0),
        status: t.status,
        openedAt: t.opened_at || t.openedAt || null,
        closedAt: t.closed_at || t.closedAt || null,
        closedBy: t.closed_by || t.closedBy || null,
        closeNotes: t.close_notes || t.closeNotes || null,
        date: t.closed_at ? t.closed_at.split('T')[0] : (t.date || null),
    };
}

function mapLogFromApi(l) {
    if (!l) return l;
    return {
        id: l.id,
        branch_id: l.branch_id,
        user: l.user_name || 'System User',
        action: l.action,
        text: l.detail || '',
        time: l.created_at || new Date().toISOString()
    };
}

// ─────────────────────────────────────────────────────────────
// Load all data from API on init
// ─────────────────────────────────────────────────────────────
async function initDB() {
    try {
        const data = await apiFetch('/api/room-care');
        branchesDB = data.branches || [];
        logsDB = (data.logs || []).map(mapLogFromApi);
        // data.rooms is an array of rooms for the default branch
        const rooms = Array.isArray(data.rooms) ? data.rooms : [];
        if (branchesDB.length > 0) {
            const defaultBranchId = branchesDB[0].id;
            roomsDB = {};
            roomsDB[defaultBranchId] = rooms.map(mapRoomFromApi);
        }
    } catch (err) {
        console.error('RC initDB failed:', err);
        notify.error('ไม่สามารถโหลดข้อมูลห้องพักได้ กรุณาลองใหม่อีกครั้ง');
        branchesDB = [];
        roomsDB = {};
        logsDB = [];
    }
}

// ─────────────────────────────────────────────────────────────
// Load rooms for a specific branch from API
// ─────────────────────────────────────────────────────────────
async function loadBranchRooms(branchId) {
    try {
        const rows = await apiFetch(`/api/room-care?action=rooms&branch_id=${branchId}`);
        roomsDB[branchId] = (Array.isArray(rows) ? rows : []).map(mapRoomFromApi);
    } catch (err) {
        console.error('loadBranchRooms failed:', err);
        roomsDB[branchId] = [];
    }
}

// ─────────────────────────────────────────────────────────────
// Post action log to API
// ─────────────────────────────────────────────────────────────
async function addActionLog(action, text) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = document.getElementById('branchSelect')?.value || null;
    try {
        await apiFetch('/api/room-care?action=add_log', {
            method: 'POST',
            body: JSON.stringify({
                branch_id: branchId,
                user_name: user.name || 'System User',
                action: action,
                detail: text
            })
        });
        // Reload logs
        const updatedLogs = await apiFetch(`/api/room-care?action=logs${branchId ? '&branch_id=' + branchId : ''}`);
        logsDB = (Array.isArray(updatedLogs) ? updatedLogs : []).map(mapLogFromApi);
        renderLogsPanel();
    } catch (err) {
        console.error('addActionLog failed:', err);
    }
}

// ─────────────────────────────────────────────────────────────
// Settings (systemsList, roomTypesList, assigneesList)
// ─────────────────────────────────────────────────────────────
async function initSystemsList() {
    try {
        const settings = await apiFetch('/api/room-care?action=settings');
        systemsList = settings.systems || ['Electrical', 'AC', 'Plumbing', 'Furniture', 'Appliances'];
        roomTypesList = settings.room_types || ['Standard', 'Deluxe', 'Suite', 'Penthouse'];
        assigneesList = settings.assignees || [];
    } catch {
        systemsList = ['Electrical', 'AC', 'Plumbing', 'Furniture', 'Appliances'];
        roomTypesList = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];
        assigneesList = [];
    }
}

async function saveSystemsList() {
    try {
        await apiFetch('/api/room-care?action=update_settings', {
            method: 'POST',
            body: JSON.stringify({ key: 'systems', value: systemsList })
        });
    } catch (err) { console.error('saveSystemsList:', err); }
}

async function saveRoomTypesList() {
    try {
        await apiFetch('/api/room-care?action=update_settings', {
            method: 'POST',
            body: JSON.stringify({ key: 'room_types', value: roomTypesList })
        });
    } catch (err) { console.error('saveRoomTypesList:', err); }
}

async function saveAssigneesList() {
    try {
        await apiFetch('/api/room-care?action=update_settings', {
            method: 'POST',
            body: JSON.stringify({ key: 'assignees', value: assigneesList })
        });
    } catch (err) { console.error('saveAssigneesList:', err); }
}

// ─────────────────────────────────────────────────────────────
// RoomTypesList helpers (sync UI dropdowns)
// ─────────────────────────────────────────────────────────────
function initRoomTypesList() {
    rebuildRoomTypeSelects();
}

function rebuildRoomTypeSelects() {
    const defaultTypes = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];
    const allTypes = [...new Set([...defaultTypes, ...roomTypesList])];

    ['floorFormRoomType', 'roomFormType'].forEach(selectId => {
        const el = document.getElementById(selectId);
        if (!el) return;
        const currentVal = el.value || 'Standard';
        let html = allTypes.map(t => `<option value="${t}" ${t === currentVal ? 'selected' : ''}>${t}</option>`).join('');
        html += `<option value="ADD_NEW_TYPE" class="text-indigo-600 font-bold">+ เพิ่มประเภทใหม่...</option>`;
        el.innerHTML = html;
    });

    if (choiceFloorRoomType) { try { choiceFloorRoomType.destroy(); } catch (e) { } choiceFloorRoomType = null; }
    if (choiceFormType) { try { choiceFormType.destroy(); } catch (e) { } choiceFormType = null; }

    if (typeof Choices !== 'undefined') {
        const floorEl = document.getElementById('floorFormRoomType');
        const roomEl = document.getElementById('roomFormType');
        if (floorEl) choiceFloorRoomType = new Choices(floorEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
        if (roomEl) choiceFormType = new Choices(roomEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
    }
}

function addNewRoomType(selectId) {
    Swal.fire({
        title: 'เพิ่มประเภทห้องพักใหม่',
        text: 'กรอกชื่อประเภทห้องพัก เช่น Family, Accessible',
        input: 'text',
        inputPlaceholder: 'เช่น Family Room',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) return 'กรุณากรอกชื่อประเภทห้อง!';
            if (roomTypesList.some(t => t.toLowerCase() === value.trim().toLowerCase())) return 'ประเภทนี้มีอยู่แล้ว!';
        }
    }).then(async res => {
        if (res.isConfirmed) {
            const newType = res.value.trim();
            roomTypesList.push(newType);
            await saveRoomTypesList();
            rebuildRoomTypeSelects();
            if (selectId === 'floorFormRoomType' && choiceFloorRoomType) choiceFloorRoomType.setChoiceByValue(newType);
            else if (selectId === 'roomFormType' && choiceFormType) choiceFormType.setChoiceByValue(newType);
            notify.success(`เพิ่มประเภทห้อง "${newType}" สำเร็จ!`);
        }
    });
}

// ─────────────────────────────────────────────────────────────
// Assignees helpers
// ─────────────────────────────────────────────────────────────
function initAssigneesList() {
    rebuildAssigneeSelects();
}

function rebuildAssigneeSelects() {
    ['repairAssignee', 'editTicketAssignee'].forEach(selectId => {
        const el = document.getElementById(selectId);
        if (!el) return;
        let html = `<option value="">-- ยังไม่มอบหมาย (รอช่าง) --</option>`;
        html += assigneesList.map(a => `<option value="${a}">${a}</option>`).join('');
        html += `<option value="ADD_NEW_TECHNICIAN" class="text-indigo-600 font-bold">+ เพิ่มช่างใหม่...</option>`;
        el.innerHTML = html;
    });

    if (choiceAssignee) { try { choiceAssignee.destroy(); } catch (e) { } choiceAssignee = null; }
    if (choiceEditAssignee) { try { choiceEditAssignee.destroy(); } catch (e) { } choiceEditAssignee = null; }

    if (typeof Choices !== 'undefined') {
        const repairEl = document.getElementById('repairAssignee');
        const editEl = document.getElementById('editTicketAssignee');
        if (repairEl) choiceAssignee = new Choices(repairEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
        if (editEl) choiceEditAssignee = new Choices(editEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
    }
}

function addNewTechnician(selectId) {
    Swal.fire({
        title: 'เพิ่มช่างเทคนิคใหม่',
        text: 'กรอกชื่อช่างเทคนิค',
        input: 'text',
        inputPlaceholder: 'เช่น สมชาย ช่างไฟ',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) return 'กรุณากรอกชื่อช่าง!';
            if (assigneesList.some(a => a.toLowerCase() === value.trim().toLowerCase())) return 'ชื่อนี้มีอยู่แล้ว!';
        }
    }).then(async res => {
        if (res.isConfirmed) {
            const newTech = res.value.trim();
            assigneesList.push(newTech);
            await saveAssigneesList();
            rebuildAssigneeSelects();
            if (selectId === 'repairAssignee' && choiceAssignee) choiceAssignee.setChoiceByValue(newTech);
            else if (selectId === 'editTicketAssignee' && choiceEditAssignee) choiceEditAssignee.setChoiceByValue(newTech);
            notify.success(`เพิ่มช่าง "${newTech}" สำเร็จ!`);
        }
    });
}

// ─────────────────────────────────────────────────────────────
// checkRoomCareAccess (keep same signature for compatibility)
// ─────────────────────────────────────────────────────────────
function checkRoomCareAccess(permission) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || '';
    if (permission === 'delete') {
        return ['Admin', 'SuperAdmin', 'Manager'].includes(role);
    }
    if (permission === 'edit' || permission === 'create') {
        return ['Admin', 'SuperAdmin', 'Manager', 'Technician', 'Staff'].includes(role);
    }
    return true;
}
