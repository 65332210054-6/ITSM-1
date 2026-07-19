// ============================================================
// rc-assignees.js — Assignees, Room Types & Systems management
// NOTE: Core functions (saveSystemsList, initSystemsList, etc.) 
// are now defined in rc-core.js which handles API persistence.
// This file retains UI-only helpers for the assignee select UI.
// ============================================================

// --- Mock Repair History Generator (kept for legacy reference, not used in production) ---
// This function is intentionally a no-op stub. Repair history comes from the real database.
function generateMockRepairs(roomNumber, count = 0) {
    return [];
}
