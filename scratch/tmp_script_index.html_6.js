// Load Dashboard Stats
        async function loadDashboardStats() {
            const statsGrid = document.getElementById('statsGrid');
            try {
                const response = await apiFetch('/api/dashboard?action=getStats');
                const stats = await response.json();
                
                statsGrid.innerHTML = `
                    <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                                <i data-lucide="users" class="h-4 w-4 sm:h-5 sm:w-5 text-blue-600"></i>
                            </div>
                            <h4 class="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">พนักงานทั้งหมด</h4>
                        </div>
                        <p class="text-2xl sm:text-4xl font-extrabold text-slate-900">${stats.totalUsers}</p>
                    </div>
                    <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                                <i data-lucide="monitor" class="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600"></i>
                            </div>
                            <h4 class="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">ทรัพย์สินไอที</h4>
                        </div>
                        <p class="text-2xl sm:text-4xl font-extrabold text-slate-900">${stats.totalAssets}</p>
                    </div>
                    <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                                <i data-lucide="ticket" class="h-4 w-4 sm:h-5 sm:w-5 text-amber-600"></i>
                            </div>
                            <h4 class="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">งานค้างซ่อม</h4>
                        </div>
                        <p class="text-2xl sm:text-4xl font-extrabold text-slate-900">${stats.pendingTickets}</p>
                    </div>
                    <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center">
                                <i data-lucide="check-circle" class="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600"></i>
                            </div>
                            <h4 class="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">ซ่อมเสร็จเดือนนี้</h4>
                        </div>
                        <p class="text-2xl sm:text-4xl font-extrabold text-slate-900">${stats.resolvedThisMonth}</p>
                    </div>
                `;
                lucide.createIcons();
            } catch (error) {
                console.error('Failed to load stats:', error);
                statsGrid.innerHTML = '<div class="col-span-full p-10 text-center text-red-500 font-bold">ไม่สามารถโหลดข้อมูลสถิติได้</div>';
            }
        }

        async function loadDashboardCharts() {
            try {
                const response = await apiFetch('/api/dashboard?action=getChartData');
                const data = await response.json();

                // Category Chart (Doughnut)
                data.assetsByCategory.sort((a, b) => parseInt(b.count) - parseInt(a.count));
                const categoryCtx = document.getElementById('categoryChart').getContext('2d');
                const totalCategoryAssets = data.assetsByCategory.reduce((sum, a) => sum + parseInt(a.count), 0);
                
                new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: data.assetsByCategory.map(a => a.category),
                        datasets: [{
                            data: data.assetsByCategory.map(a => a.count),
                            backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                            borderWidth: 0,
                            spacing: 4,
                            hoverOffset: 15
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: 20 },
                        plugins: {
                            tooltip: {
                                usePointStyle: true,
                                callbacks: {
                                    title: () => null,
                                    label: (context) => {
                                        const label = context.label || '';
                                        const value = context.parsed || context.raw;
                                        const percent = totalCategoryAssets > 0 ? Math.round((value / totalCategoryAssets) * 100) : 0;
                                        return [
                                            ` ${label}`,
                                            ` จำนวน: ${value} (${percent}%)`
                                        ];
                                    }
                                }
                            },
                            legend: { 
                                position: 'right', 
                                labels: { 
                                    usePointStyle: true, 
                                    padding: 20, 
                                    font: { weight: '600' },
                                    generateLabels: (chart) => {
                                        const datasets = chart.data.datasets;
                                        return chart.data.labels.map((label, i) => {
                                            const value = datasets[0].data[i];
                                            const percent = totalCategoryAssets > 0 ? Math.round((value / totalCategoryAssets) * 100) : 0;
                                            return {
                                                text: `${label}: ${value} (${percent}%)`,
                                                fillStyle: datasets[0].backgroundColor[i],
                                                strokeStyle: datasets[0].backgroundColor[i],
                                                pointStyle: 'circle',
                                                hidden: isNaN(datasets[0].data[i]) || chart.getDatasetMeta(0).data[i].hidden,
                                                index: i
                                            };
                                        });
                                    }
                                } 
                            }
                        },
                        cutout: '70%',
                        onHover: (event, chartElement) => {
                            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                        }
                    }
                });

                // Trend Chart (Bar)
                const trendCtx = document.getElementById('trendChart').getContext('2d');
                new Chart(trendCtx, {
                    type: 'bar',
                    data: {
                        labels: data.ticketTrends.map(t => t.month),
                        datasets: [{
                            label: 'จำนวนงานแจ้งซ่อม',
                            data: data.ticketTrends.map(t => t.count),
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            borderColor: '#6366f1',
                            borderWidth: 2,
                            borderRadius: 8,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { display: false } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to load charts:', error);
            }
        }

        async function loadRecentActivity() {
            const feed = document.getElementById('activityFeed');
            try {
                const response = await apiFetch('/api/dashboard?action=getRecentActivity');
                if (!response.ok) throw new Error('API Error');
                const logs = await response.json();
                
                if (logs.length === 0) {
                    feed.innerHTML = '<div class="py-10 text-center text-slate-400 text-xs font-medium">ไม่มีกิจกรรมล่าสุด</div>';
                    return;
                }

                feed.innerHTML = logs.map(log => `
                    <div class="flex gap-3 group">
                        <div class="w-8 h-8 rounded-full ${log.action === 'Delete' ? 'bg-red-50 text-red-500' : log.action === 'Create' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'} flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110">
                            <i data-lucide="${log.module === 'Users' ? 'user' : log.module === 'Assets' ? 'monitor' : 'ticket'}" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] font-bold text-slate-700 leading-tight">
                                ${escapeHTML(log.user_name || 'System')} <span class="font-normal text-slate-500">${log.action === 'Create' ? 'เพิ่ม' : log.action === 'Delete' ? 'ลบ' : 'แก้ไข'} ${log.module}</span>
                            </p>
                            <p class="text-[10px] text-slate-400 mt-0.5">${new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} • ${log.module}</p>
                        </div>
                    </div>
                `).join('');
                lucide.createIcons();
            } catch (error) {
                console.error('Failed to load activity:', error);
                feed.innerHTML = '<div class="py-10 text-center text-red-400 text-xs font-medium">เกิดข้อผิดพลาดในการโหลด</div>';
            }
        }

        async function initDashboard() {
            try {
                const settings = await ui.getSystemSettings();
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const isAdmin = user.role === 'Admin';

                // Show/Hide buttons based on modules with centralized ui.checkAccess
                const btnUsers = document.getElementById('btnUsers');
                const btnAssets = document.getElementById('btnAssets');
                const btnTickets = document.getElementById('btnTickets');
                const btnSettings = document.getElementById('btnSettings');

                if (btnUsers && ui.checkAccess('module_users_enabled', settings, user)) btnUsers.classList.remove('hidden');
                if (btnAssets && ui.checkAccess('module_assets_enabled', settings, user)) btnAssets.classList.remove('hidden', 'md:flex'); // Restore flow
                if (btnTickets && ui.checkAccess('module_tickets_enabled', settings, user)) btnTickets.classList.remove('hidden');
                if (btnSettings && isAdmin) btnSettings.classList.remove('hidden');

                // Adjust grid based on visible buttons
                const welcomeGrid = btnUsers.parentElement;
                welcomeGrid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12 relative z-10";

                loadDashboardStats();
                loadDashboardCharts();
                loadRecentActivity();
            } catch (err) {
                console.error("Dashboard Init Error:", err);
            }
        }

        document.addEventListener('DOMContentLoaded', initDashboard);