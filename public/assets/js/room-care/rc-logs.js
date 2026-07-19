// ============================================================
// rc-logs.js — Log Filters & Log Detail Modal
// ============================================================

function toggleLogFilters() {
    const area = document.getElementById('logFiltersArea');
    area.classList.toggle('hidden');
}

function applyLogFilters() {
    renderLogsPanel();
}

function resetLogFilters() {
    if (document.getElementById('searchLogText')) document.getElementById('searchLogText').value = '';
    if (document.getElementById('filterLogAction')) document.getElementById('filterLogAction').value = 'All';
    renderLogsPanel();
}

function openLogDetailModal(index) {
    const log = logsDB[index];
    if (!log) return;

    let badgeClass = 'bg-slate-50 text-slate-500 border-slate-200';
    if (log.action === 'ตรวจเช็คระบบ') badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    if (log.action === 'เปิดแจ้งซ่อม') badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
    if (log.action === 'เริ่มซ่อม') badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
    if (log.action === 'แก้ไขใบงาน') badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
    if (log.action === 'ซ่อมสำเร็จ') badgeClass = 'bg-blue-50 text-blue-600 border border-blue-100';
    if (log.action === 'เพิ่มสาขา') badgeClass = 'bg-teal-50 text-teal-600 border border-teal-100';
    if (log.action === 'เพิ่มห้องพัก') badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
    if (log.action === 'แก้ไขห้องพัก') badgeClass = 'bg-purple-50 text-purple-600 border border-purple-100';
    if (log.action === 'ลบห้องพัก') badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
    if (log.action === 'เพิ่มระบบใหม่') badgeClass = 'bg-pink-50 text-pink-600 border border-pink-100';
    if (log.action === 'แก้ไขสถานะ') badgeClass = 'bg-slate-50 text-slate-700 border border-slate-200';

    const badgeEl = document.getElementById('logDetailActionBadge');
    badgeEl.className = `text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${badgeClass}`;
    badgeEl.innerText = log.action;

    document.getElementById('logDetailText').innerText = log.text;
    document.getElementById('logDetailUser').innerText = log.user;

    const formattedDate = new Date(log.time).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('logDetailTime').innerText = formattedDate;

    document.getElementById('logDetailModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeLogDetailModal() {
    document.getElementById('logDetailModal').classList.add('hidden');
}
