import { PrismaClient } from "@prisma/client"
import { PrismaD1 } from "@prisma/adapter-d1"

// 💡 Using a proxy to conditionally initialize PrismaClient based on the execution context.
// Cloudflare Pages uses Edge runtime, where we must bind to process.env or getRequestContext().
// Standard Node environments (e.g. Next dev) will fall back to SQLite locally.

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    let client
    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
    
    if (globalForPrisma.prisma) {
      client = globalForPrisma.prisma
    } else {
      try {
        const { getRequestContext } = require("@cloudflare/next-on-pages")
        const ctx = getRequestContext()
        
        if (ctx?.env?.DB) {
          // Edge Context: D1 Adapter
          console.log("[Prisma] Connecting to Cloudflare D1 (management_db)")
          const adapter = new PrismaD1(ctx.env.DB)
          client = new PrismaClient({ adapter })
        } else {
          // Fallback (Local or Preview)
          client = new PrismaClient()
        }
      } catch (err) {
        // Fallback for Node.js Development
        client = new PrismaClient()
      }

      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = client
      }
    }

    // Bind methods to the actual client instance
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  }
})
