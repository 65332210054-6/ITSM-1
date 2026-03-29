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
  assetData,
  assetStatusData
}: {
  assetData: ChartData[]
  assetStatusData: ChartData[]
}) {
  const formattedAssetStatusData = assetStatusData.map(d => ({
    name: ASSET_STATUS_LABELS[d.name] || d.name,
    rawName: d.name,
    value: d.value
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Asset Category Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">อุปกรณ์แยกตามหมวดหมู่</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip 
                    formatter={(value: any) => [`${value} ชิ้น`, 'จำนวน']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {assetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">ยังไม่มีข้อมูลอุปกรณ์ในระบบ</div>
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
          <div className="h-[300px] w-full">
            {assetStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedAssetStatusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {formattedAssetStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ASSET_STATUS_COLORS[entry.rawName] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} ชิ้น`, 'จำนวน']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value: string) => <span className="text-slate-600 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">ยังไม่มีข้อมูลอุปกรณ์ในระบบ</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
