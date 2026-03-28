"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#ef4444',
  IN_PROGRESS: '#3b82f6',
  WAITING_PARTS: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#64748b'
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "เปิดรอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  WAITING_PARTS: "รออะไหล่",
  RESOLVED: "แก้ไขแล้ว",
  CLOSED: "ปิดงาน"
}

const ASSET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  BROKEN: '#ef4444',
  IN_REPAIR: '#f59e0b',
  RETIRED: '#64748b',
  MISSING: '#8b5cf6'
}

const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ใช้งานปกติ",
  BROKEN: "ชำรุด",
  IN_REPAIR: "ส่งซ่อม",
  RETIRED: "จำหน่าย",
  MISSING: "สูญหาย"
}

interface ChartData {
  name: string
  value: number
}

export function ClientCharts({
  ticketData,
  assetData,
  assetStatusData
}: {
  ticketData: ChartData[]
  assetData: ChartData[]
  assetStatusData: ChartData[]
}) {
  const formattedTicketData = ticketData.map(d => ({
    name: STATUS_LABELS[d.name] || d.name,
    rawName: d.name,
    value: d.value
  }))

  const formattedAssetStatusData = assetStatusData.map(d => ({
    name: ASSET_STATUS_LABELS[d.name] || d.name,
    rawName: d.name,
    value: d.value
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Ticket Status Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">สถานะงานแจ้งซ่อม</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            {ticketData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedTicketData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {formattedTicketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.rawName] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} รายการ`, 'จำนวน']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลงานซ่อม</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Asset Category Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">อุปกรณ์แยกตามหมวดหมู่</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip 
                    formatter={(value: any) => [`${value} ชิ้น`, 'จำนวน']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {assetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลอุปกรณ์</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Asset Status Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">สถานะอุปกรณ์ทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            {assetStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedAssetStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {formattedAssetStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ASSET_STATUS_COLORS[entry.rawName] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} ชิ้น`, 'จำนวน']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูลอุปกรณ์</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
