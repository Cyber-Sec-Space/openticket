import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login');
  const isOnRegisterPage = req.nextUrl.pathname.startsWith('/register');
  const isOnSetupPage = req.nextUrl.pathname.startsWith('/setup');

  if (isOnLoginPage || isOnRegisterPage || isOnSetupPage) {
    if (isLoggedIn) return Response.redirect(new URL('/', req.nextUrl));
    return;
  }

  if (!isLoggedIn) {
     return Response.redirect(new URL('/login', req.nextUrl));
  }
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)$).*)'],
}
