import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool } from "@neondatabase/serverless"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("neon.tech")) {
    const neonPool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaNeon(neonPool) as any
    return new PrismaClient({ adapter })
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
