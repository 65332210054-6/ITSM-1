// ============================================================
// rc-permissions.js — Access Control Helpers
// ============================================================

function checkRoomCareAccess(action) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const settings = JSON.parse(localStorage.getItem('system_settings') || '{}');
    return ui.checkAccess('room_care', settings, user, action);
}

function updateActionButtonsVisibility() {
    const canCreate = checkRoomCareAccess('create');
    const canDelete = checkRoomCareAccess('delete');

    // Add Branch button
    const addBranchBtn = document.querySelector('button[onclick="addNewBranch()"]');
    if (addBranchBtn) addBranchBtn.style.display = canCreate ? '' : 'none';

    // Delete Branch button
    const deleteBranchBtn = document.getElementById('deleteBranchBtn');
    if (deleteBranchBtn) deleteBranchBtn.style.display = canDelete ? '' : 'none';

    // Add Floor button
    const addFloorBtn = document.querySelector('button[onclick="openFloorModal()"]');
    if (addFloorBtn) addFloorBtn.style.display = canCreate ? '' : 'none';
}
