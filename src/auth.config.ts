import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLogin = nextUrl.pathname.startsWith("/login")
      
      const isPublicPath = isLogin || nextUrl.pathname.startsWith("/api/export") || nextUrl.pathname.startsWith("/api/images")
      
      if (isLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      
      if (!isLoggedIn && !isPublicPath && !nextUrl.pathname.startsWith("/_next")) {
        return false // Redirect to /login
      }
      return true
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        ;(session.user as any).roleName = token.roleName as string | undefined
      }
      return session
    },
    jwt({ token, user }) {
      if (user) {
        token.roleName = (user as any).roleName
      }
      return token
    }
  },
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig
