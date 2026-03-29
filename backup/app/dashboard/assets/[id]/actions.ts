"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateComputerDetail(assetId: string, formData: FormData) {
  const cpu = formData.get("cpu") as string
  const ram = formData.get("ram") as string
  const storage = formData.get("storage") as string
  const os = formData.get("os") as string
  const type = formData.get("type") as string
  const leaseContractNo = formData.get("leaseContractNo") as string

  await prisma.computerDetail.upsert({
    where: { assetId },
    create: { assetId, cpu, ram, storage, os, type: type || null, leaseContractNo: leaseContractNo || null },
    update: { cpu, ram, storage, os, type: type || null, leaseContractNo: leaseContractNo || null }
  })
  revalidatePath(`/assets/${assetId}`)
  revalidatePath(`/assets/${assetId}/edit`)
}

export async function updateMonitorDetail(assetId: string, formData: FormData) {
  const sizeInches = formData.get("sizeInches") as string
  const resolution = formData.get("resolution") as string
  const panelType = formData.get("panelType") as string
  const ports = formData.get("ports") as string

  await prisma.monitorDetail.upsert({
    where: { assetId },
    create: { 
      assetId, 
      sizeInches: sizeInches ? parseFloat(sizeInches) : null,
      resolution: resolution || null,
      panelType: panelType || null,
      ports: ports || null,
    },
    update: { 
      sizeInches: sizeInches ? parseFloat(sizeInches) : null,
      resolution: resolution || null,
      panelType: panelType || null,
      ports: ports || null,
    }
  })
  revalidatePath(`/assets/${assetId}`)
  revalidatePath(`/assets/${assetId}/edit`)
}

export async function updateNetworkDetail(assetId: string, formData: FormData) {
  const ipAddress = formData.get("ipAddress") as string
  const macAddress = formData.get("macAddress") as string
  const bandwidth = formData.get("bandwidth") as string
  const type = formData.get("type") as string
  const vlan = formData.get("vlan") as string
  const firmwareVersion = formData.get("firmwareVersion") as string

  await prisma.networkDetail.upsert({
    where: { assetId },
    create: { assetId, ipAddress, macAddress, bandwidth, type: type || null, vlan: vlan || null, firmwareVersion: firmwareVersion || null },
    update: { ipAddress, macAddress, bandwidth, type: type || null, vlan: vlan || null, firmwareVersion: firmwareVersion || null }
  })
  revalidatePath(`/assets/${assetId}`)
  revalidatePath(`/assets/${assetId}/edit`)
}

export async function updatePrinterDetail(assetId: string, formData: FormData) {
  const type = formData.get("type") as string
  const colorType = formData.get("colorType") as string
  const ipAddress = formData.get("ipAddress") as string
  const cartridgeModel = formData.get("cartridgeModel") as string

  await prisma.printerDetail.upsert({
    where: { assetId },
    create: { assetId, type, colorType: colorType || null, ipAddress, cartridgeModel },
    update: { type, colorType: colorType || null, ipAddress, cartridgeModel }
  })
  revalidatePath(`/assets/${assetId}`)
  revalidatePath(`/assets/${assetId}/edit`)
}
