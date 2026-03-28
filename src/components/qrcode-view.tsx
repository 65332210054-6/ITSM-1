"use client"

import { QRCodeCanvas } from "qrcode.react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintQRCode({ value, label }: { value: string, label: string }) {
  
  const handlePrint = () => {
    // Generate a new window and dump the Canvas onto it as an image to print
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement
    if (!canvas) return
    
    const printWindow = window.open('', '', 'width=600,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Asset Label</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
              .sticker { border: 1px dashed #ccc; padding: 20px; text-align: center; font-family: sans-serif; }
              img { max-width: 100%; height: auto; }
              h3 { margin: 10px 0 0 0; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="sticker">
              <img src="${canvas.toDataURL("image/png")}" />
              <h3>${label}</h3>
              <p style="font-size: 10px; color: #666; margin-top: 5px;">Scan to report issue / view detail</p>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm w-full max-w-xs mx-auto">
      {/* Ensure the host URL is correct in production. Using a relative path for the QR value might not work well on smartphones since they need absolute URLs. */}
      {/* We'll assume the system domain later. For now, localhost:3000 */}
      <QRCodeCanvas id="qr-canvas" value={`http://localhost:3000${value}`} size={160} className="mb-4 bg-white p-2 rounded-lg" />
      <Button variant="outline" onClick={handlePrint} className="w-full flex items-center justify-center gap-2 border-slate-300">
        <Printer className="w-4 h-4 text-slate-600" /> พิมพ์ป้าย QR Code
      </Button>
    </div>
  )
}
