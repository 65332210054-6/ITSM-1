import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import { users, roles } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const userWithRole = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            password: users.password,
            roleName: roles.name,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.email, credentials.email as string))
          .limit(1)
          .then(res => res[0])
        
        if (!userWithRole || !userWithRole.password) return null
        
        const isPasswordValid = await bcrypt.compare(credentials.password as string, userWithRole.password)
        if (!isPasswordValid) return null
        
        return {
          id: userWithRole.id,
          email: userWithRole.email,
          name: userWithRole.name,
          roleName: userWithRole.roleName || "User"
        }
      }
    })
  ]
})
