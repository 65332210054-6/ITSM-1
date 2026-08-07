// ============================================================
// rc-init.js — DOMContentLoaded Entry Point
// Binds all form event listeners and initializes the page
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Show container loading state using global UI standard
    if (document.getElementById('floorsContainer')) {
        ui.renderContainerLoading('floorsContainer', 'กำลังโหลดข้อมูลห้องพัก...');
    }
    if (document.getElementById('logsContainer')) {
        ui.renderContainerLoading('logsContainer', 'กำลังโหลดประวัติการทำงาน...');
    }

    // Render Header and Sidebar using core ui object in app.js
    const settings = await ui.getSystemSettings();
    if (window.location.pathname.includes('room-care-logs')) {
        ui.renderHeader('ข้อมูล', false, { parent: 'ระบบบำรุงรักษาห้องพัก', url: '/room-care.html' });
    } else {
        ui.renderHeader('ระบบบำรุงรักษาห้องพัก', false);
    }
    ui.renderSidebar('sidebar-container', settings);

    // Load settings (systems, roomTypes, assignees) and data from API
    await initSystemsList();
    await initDB();

    // Populate Branches dropdown
    const selectEl = document.getElementById('branchSelect');
    if (selectEl && branchesDB.length > 0) {
        const optionsHtml = branchesDB.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        selectEl.innerHTML = optionsHtml;
    }

    // Init room types & assignees UI
    initRoomTypesList();
    rebuildRoomTypeSelects();
    rebuildAssigneeSelects();

    // Bind Choices.js for premium selection boxes
    if (typeof Choices !== 'undefined' && selectEl) {
        choiceBranch = new Choices(selectEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
        const priorityEl = document.getElementById('repairPriority');
        const editPriorityEl = document.getElementById('editTicketPriority');
        if (priorityEl) choicePriority = new Choices(priorityEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
        if (editPriorityEl) choiceEditPriority = new Choices(editPriorityEl, { searchEnabled: false, itemSelectText: '', allowHTML: false });
    }

    // Populate extensible category dropdowns and bind event listeners
    renderCategoryOptions();

    if (document.getElementById('repairCategory')) {
        document.getElementById('repairCategory').addEventListener('change', (event) => {
            if (event.target.value === 'ADD_NEW_SYSTEM') {
                addNewSystem('repairCategory');
            }
        });
    }

    if (document.getElementById('editTicketCategory')) {
        document.getElementById('editTicketCategory').addEventListener('change', (event) => {
            if (event.target.value === 'ADD_NEW_SYSTEM') {
                addNewSystem('editTicketCategory');
            }
        });
    }

    // Bind assignee ADD_NEW_TECHNICIAN events
    if (document.getElementById('repairAssignee')) {
        document.getElementById('repairAssignee').addEventListener('change', (event) => {
            if (event.target.value === 'ADD_NEW_TECHNICIAN') {
                addNewTechnician('repairAssignee');
            }
        });
    }

    if (document.getElementById('editTicketAssignee')) {
        document.getElementById('editTicketAssignee').addEventListener('change', (event) => {
            if (event.target.value === 'ADD_NEW_TECHNICIAN') {
                addNewTechnician('editTicketAssignee');
            }
        });
    }

    // Bind room type ADD_NEW_TYPE events
    if (document.getElementById('floorFormRoomType')) {
        document.getElementById('floorFormRoomType').addEventListener('change', (event) => {
            if (event.target.value === 'ADD_NEW_TYPE') {
                addNewRoomType('floorFormRoomType');
            }
        });
    }
    if (document.getElementById('roomFormType')) {
        document.getElementById('roomFormType').addEventListener('change', (event) => {
            if (event.target.value === 'ADD_NEW_TYPE') {
                addNewRoomType('roomFormType');
            }
        });
    }

    // Bind form submissions via named handler functions
    if (document.getElementById('inspectionForm')) document.getElementById('inspectionForm').addEventListener('submit', handleInspectionFormSubmit);
    if (document.getElementById('repairForm')) document.getElementById('repairForm').addEventListener('submit', handleRepairFormSubmit);
    if (document.getElementById('incidentForm')) document.getElementById('incidentForm').addEventListener('submit', handleIncidentFormSubmit);
    if (document.getElementById('editTicketForm')) document.getElementById('editTicketForm').addEventListener('submit', handleEditTicketFormSubmit);
    if (document.getElementById('floorForm')) document.getElementById('floorForm').addEventListener('submit', handleFloorFormSubmit);
    if (document.getElementById('roomForm')) document.getElementById('roomForm').addEventListener('submit', handleRoomFormSubmit);

    renderDashboard();
    if (document.getElementById('logsContainer')) renderLogsPanel();
    if (document.getElementById('filterBranchSelect')) initLogsPage();
    updateActionButtonsVisibility();
});
