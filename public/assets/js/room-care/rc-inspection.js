// ============================================================
// rc-inspection.js — Inspection Checklist Modal
// ============================================================

function renderInspectionChecklist() {
    const container = document.getElementById('inspectionChecklistItems');
    if (!container) return;

    container.innerHTML = '';

    // Get active systems excluding 'Other'
    const activeSystems = systemsList.filter(sys => sys !== 'Other');
    const details = selectedRoom.details || {};

    activeSystems.forEach((sys, idx) => {
        const sysKey = sys.toLowerCase().replace(/\s+/g, '_');
        const sysDetails = getCategoryDetails(sys);

        // Determine icon and color
        let iconName = 'settings';
        let iconColor = 'text-slate-400';
        if (sys === 'Electrical') { iconName = 'zap'; iconColor = 'text-amber-500'; }
        else if (sys === 'AC') { iconName = 'wind'; iconColor = 'text-blue-500'; }
        else if (sys === 'Plumbing') { iconName = 'droplet'; iconColor = 'text-teal-500'; }
        else if (sys === 'Furniture') { iconName = 'sofa'; iconColor = 'text-indigo-500'; }
        else if (sys === 'Appliances') { iconName = 'tv'; iconColor = 'text-purple-500'; }

        // Check if it's a core system (not in the default list)
        const isCoreSystem = ['Electrical', 'AC', 'Plumbing', 'Furniture', 'Appliances'].includes(sys);

        // Delete button HTML for custom systems
        const deleteBtnHtml = !isCoreSystem ? `
            <button type="button" onclick="deleteInspectionSystem('${sys}', event)" class="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-xl transition-all ml-1 border-0 bg-transparent cursor-pointer" title="ลบระบบนี้">
                <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
            </button>
        ` : '';

        const status = details[sysKey] || 'Normal';
        activeChecklistState[sysKey] = status;

        const showRepairFields = status === 'Needs Repair';
        const div = document.createElement('div');
        div.className = 'space-y-2 border-b border-slate-50 pb-4';
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor}"></i> ${idx + 1}. ${sysDetails.thai || sysDetails.name}
                    ${deleteBtnHtml}
                </label>
                <div class="flex gap-1.5 text-[10px] font-bold">
                    <button type="button" onclick="setSystemStatus('${sysKey}', 'Normal')" class="system-pill px-2.5 py-1 rounded-lg border border-slate-200 ${status === 'Normal' ? 'active-normal' : ''}" id="inspect_${sysKey}_Normal">ปกติ</button>
                    <button type="button" onclick="setSystemStatus('${sysKey}', 'Needs Repair')" class="system-pill px-2.5 py-1 rounded-lg border border-slate-200 ${status === 'Needs Repair' ? 'active-repair' : ''}" id="inspect_${sysKey}_Repair">ชำรุด</button>
                </div>
            </div>
            <input type="text" id="inspect_${sysKey}_notes" class="form-input text-xs py-2 px-3 placeholder:text-slate-400 bg-slate-50/50" placeholder="หมายเหตุเพิ่มเติม ${sysDetails.thai || sysDetails.name} (ถ้ามี)...">
            
            <div id="inspect_${sysKey}_repair_fields" class="${showRepairFields ? '' : 'hidden'} mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ความสำคัญ <span class="text-red-500">*</span></label>
                        <select id="inspect_${sysKey}_priority" class="form-input text-xs py-2 px-3 bg-white">
                            <option value="Low">ต่ำ (Low)</option>
                            <option value="Medium" selected>ปานกลาง (Medium)</option>
                            <option value="High">สูง (High)</option>
                            <option value="Critical">วิกฤต (Critical)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ช่างซ่อมบำรุงที่รับผิดชอบ</label>
                        <select id="inspect_${sysKey}_assignee" class="form-input text-xs py-2 px-3 bg-white" onchange="if(this.value === 'ADD_NEW_TECHNICIAN') { addNewTechnician(this.id); }">
                            <option value="ADD_NEW_TECHNICIAN" class="text-indigo-600 font-bold">+ เพิ่มชื่อช่างใหม่...</option>
                            <option value="" selected>-- ไม่ระบุช่าง --</option>
                            ${assigneesList.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ประมาณการค่าใช้จ่าย (บาท)</label>
                    <input type="number" id="inspect_${sysKey}_cost" class="form-input text-xs py-2 px-3 bg-white" placeholder="0" min="0" value="0" oninput="if(this.value < 0) this.value = 0;">
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    lucide.createIcons();
}

// ==========================================
// Delete Inspection System
// ==========================================
function deleteInspectionSystem(sysName, event) {
    if (event) event.stopPropagation();

    Swal.fire({
        title: `ยืนยันการลบระบบ ${sysName}?`,
        text: `การลบระบบ "${sysName}" จะนำระบบนี้ออกจากแบบฟอร์มตรวจประเมิน และไม่สามารถย้อนกลับได้`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'ลบระบบ',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            popup: 'rounded-3xl border-0 shadow-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600'
        }
    }).then(async (res) => {
        if (res.isConfirmed) {
            const sysKey = sysName.toLowerCase().replace(/\s+/g, '_');

            // Remove from systemsList
            systemsList = systemsList.filter(s => s !== sysName);
            await saveSystemsList();

            // Remove from activeChecklistState
            delete activeChecklistState[sysKey];

            // Re-render checklist
            renderInspectionChecklist();

            // Update dropdowns
            renderCategoryOptions();
            await addActionLog('ลบระบบ', `ลบระบบอุปกรณ์ออกจากระบบตรวจเช็ค: ${sysName}`);
            notify.success(`ลบระบบ "${sysName}" สำเร็จ!`);
        }
    });
}

function openInspectionModal() {
    if (!checkRoomCareAccess('create')) {
        notify.error('คุณไม่มีสิทธิ์ในการตรวจเช็คระบบ');
        return;
    }
    if (!selectedRoom) return;
    document.getElementById('inspectRoomLabel').innerText = selectedRoom.number;

    // Render the systems checklist dynamically
    renderInspectionChecklist();

    // Set note inputs to blank
    const activeSystems = systemsList.filter(sys => sys !== 'Other');
    activeSystems.forEach(sys => {
        const sysKey = sys.toLowerCase().replace(/\s+/g, '_');
        const noteInput = document.getElementById(`inspect_${sysKey}_notes`);
        if (noteInput) {
            noteInput.value = '';
        }
    });

    document.getElementById('inspectionModal').classList.remove('hidden');
}

function closeInspectionModal() {
    document.getElementById('inspectionModal').classList.add('hidden');
}

function setSystemStatus(systemKey, status) {
    activeChecklistState[systemKey] = status;

    // Reset pills
    const normalBtn = document.getElementById(`inspect_${systemKey}_Normal`);
    const repairBtn = document.getElementById(`inspect_${systemKey}_Repair`);

    if (normalBtn) normalBtn.className = 'system-pill px-2.5 py-1 rounded-lg border border-slate-200';
    if (repairBtn) repairBtn.className = 'system-pill px-2.5 py-1 rounded-lg border border-slate-200';

    if (status === 'Normal') {
        if (normalBtn) normalBtn.classList.add('active-normal');
    } else {
        if (repairBtn) repairBtn.classList.add('active-repair');
    }

    // Toggle repair fields visibility
    const repairFields = document.getElementById(`inspect_${systemKey}_repair_fields`);
    if (repairFields) {
        if (status === 'Needs Repair') {
            repairFields.classList.remove('hidden');
        } else {
            repairFields.classList.add('hidden');
        }
    }
}

// ==========================================
// Add New Inspection System (in inspection modal)
// ==========================================
function addNewInspectionSystem() {
    Swal.fire({
        title: 'เพิ่มระบบตรวจเช็คใหม่',
        text: 'ระบุชื่อระบบหรืออุปกรณ์ที่ต้องการตรวจเช็ค (ภาษาอังกฤษ เช่น CCTV, Network, Safe, Minibar)',
        input: 'text',
        inputPlaceholder: 'เช่น CCTV',
        showCancelButton: true,
        confirmButtonText: 'เพิ่มระบบ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'rounded-3xl border-0 shadow-2xl', confirmButton: 'rounded-xl px-6 py-2.5 font-bold', cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-slate-600' },
        inputValidator: (value) => {
            if (!value) return 'กรุณาระบุชื่อระบบ!';
            const key = value.trim().toLowerCase().replace(/\s+/g, '_');
            if (systemsList.some(s => s.toLowerCase() === value.trim().toLowerCase())) return 'ระบบนี้มีอยู่ในระบบแล้ว!';
        }
    }).then(async res => {
        if (res.isConfirmed) {
            const newSysName = res.value.trim();
            const sysKey = newSysName.toLowerCase().replace(/\s+/g, '_');

            // Add to systemsList
            systemsList.push(newSysName);
            await saveSystemsList();

            // Add to checklist state
            activeChecklistState[sysKey] = 'Normal';

            // Re-render checklist UI
            renderInspectionChecklist();

            // Also update category dropdowns and log
            renderCategoryOptions();
            await addActionLog('เพิ่มระบบใหม่', `เพิ่มระบบอุปกรณ์ใหม่ในระบบตรวจเช็ค: ${newSysName}`);
            notify.success(`เพิ่มระบบ "${newSysName}" เรียบร้อย!`);
        }
    });
}

// Handle inspection checklist submission (bound in rc-init.js)
async function handleInspectionFormSubmit(e) {
    e.preventDefault();
    if (!selectedRoom) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = document.getElementById('branchSelect').value;

    // Collect broken systems (one entry per system)
    let brokenSystems = [];
    for (const key in activeChecklistState) {
        if (activeChecklistState[key] === 'Needs Repair') {
            const matchedSys = systemsList.find(sys => sys.toLowerCase().replace(/\s+/g, '_') === key);
            const categoryInfo = matchedSys ? getCategoryDetails(matchedSys) : null;
            const sysLabel = categoryInfo ? (categoryInfo.thai || categoryInfo.name) : key;
            const noteInput = document.getElementById(`inspect_${key}_notes`);
            const note = noteInput ? noteInput.value.trim() : '';
            brokenSystems.push({ key, matchedSys: matchedSys || key, label: sysLabel, note });
        }
    }

    const needsRepair = brokenSystems.length > 0;
    const newStatus = needsRepair ? 'Needs Repair' : 'Available';
    let logText = `ตรวจเช็คระบบห้อง ${selectedRoom.number} สถานะภาพรวม: `;

    // Collect ticket IDs to auto-close if room passes inspection
    const closeTicketIds = !needsRepair ? (selectedRoom.activeTickets || []).map(t => t.id) : [];

    try {
        // 1. Save inspection result to API
        await apiFetch('/api/room-care?action=update_room_inspection', {
            method: 'PUT',
            body: JSON.stringify({
                room_id: selectedRoom.id,
                details: { ...activeChecklistState },
                status: newStatus,
                inspector: user.name || 'System Auditor',
                close_tickets: closeTicketIds
            })
        });

        if (needsRepair) {
            const brokenLabels = brokenSystems.map(s => s.label + (s.note ? ` (${s.note})` : ''));
            logText += `ชำรุดรอซ่อมแซม (Needs Repair) - ชำรุดจุด: ${brokenLabels.join(', ')}`;

            // 2. Auto create ticket per broken system if checked
            if (document.getElementById('inspectAutoCreateRepair').checked) {
                for (const sys of brokenSystems) {
                    const desc = sys.label + (sys.note ? ` - ${sys.note}` : ' - พบระหว่างตรวจเช็คประจำ');
                    const priorityEl = document.getElementById(`inspect_${sys.key}_priority`);
                    const priority = priorityEl ? priorityEl.value : 'Medium';
                    const assigneeEl = document.getElementById(`inspect_${sys.key}_assignee`);
                    const assignee = (assigneeEl && assigneeEl.value !== 'ADD_NEW_TECHNICIAN' && assigneeEl.value) ? assigneeEl.value : null;
                    const costEl = document.getElementById(`inspect_${sys.key}_cost`);
                    let cost = costEl ? parseFloat(costEl.value) : 0;
                    if (isNaN(cost) || cost < 0) cost = 0;

                    const ticket = await apiFetch('/api/room-care?action=add_ticket', {
                        method: 'POST',
                        body: JSON.stringify({
                            room_id: selectedRoom.id,
                            branch_id: branchId,
                            desc, category: sys.matchedSys, priority, assignee, cost
                        })
                    });
                    await addActionLog('เปิดแจ้งซ่อม', `สร้างใบซ่อม #${ticket.id?.toUpperCase()} ห้อง ${selectedRoom.number} ระบบ: ${sys.label} จากผลเช็คสภาพห้อง (ช่าง: ${assignee || 'รอช่างเข้าดู'}, ความสำคัญ: ${priority}, ค่าอะไหล่: ${cost}.-)`);
                }
            }
        } else {
            logText += 'ปกติผ่านเกณฑ์ (Available)';
            if (closeTicketIds.length > 0) {
                for (const tid of closeTicketIds) {
                    await addActionLog('ซ่อมสำเร็จ', `ปิดใบงาน #${tid.toUpperCase()} ห้อง ${selectedRoom.number} อัตโนมัติ: ตรวจเช็คใหม่ผ่านเกณฑ์ปกติทุกระบบ`);
                }
            }
        }

        await addActionLog('ตรวจเช็คระบบ', logText);
        await loadBranchRooms(branchId);
        selectedRoom = (roomsDB[branchId] || []).find(r => r.id === selectedRoom.id) || selectedRoom;
        closeInspectionModal();
        openRoomDetails(selectedRoom.id);
        notify.success('บันทึกผลการเช็คห้องพักสำเร็จ!');
    } catch (err) {
        console.error('handleInspectionFormSubmit:', err);
        notify.error('เกิดข้อผิดพลาดในการบันทึกผลการตรวจเช็ค');
    }
}
