import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  // Legacy 0.3.0 JWT tokens do not contain 'permissions'. 
  // We must fail them at the Edge to prevent an infinite redirect loop between Node.js layout and Edge proxy.
  const isLoggedIn = !!req.auth && Array.isArray(req.auth.user?.permissions);
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login');
  const isOnRegisterPage = req.nextUrl.pathname.startsWith('/register');
  const isOnSetupPage = req.nextUrl.pathname.startsWith('/setup');

  if (isOnLoginPage || isOnRegisterPage || isOnSetupPage) {
    if (isLoggedIn) {
       // Loop Escape Hatch: Deep intercept Node.js ghost token expulsions
       if (req.nextUrl.searchParams.has('clearsession')) {
          const res = NextResponse.redirect(new URL('/login', req.nextUrl));
          res.cookies.delete("authjs.session-token");
          res.cookies.delete("__Secure-authjs.session-token");
          return res;
       }
       return Response.redirect(new URL('/', req.nextUrl));
    }
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
