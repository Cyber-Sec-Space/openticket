import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  // Legacy 0.3.0 JWT tokens do not contain 'permissions'. 
  // We must fail them at the Edge to prevent an infinite redirect loop between Node.js layout and Edge proxy.
  const isLoggedIn = !!req.auth && Array.isArray(req.auth.user?.permissions);
  console.log(`[PROXY] Request: ${req.nextUrl.pathname}, isLoggedIn: ${isLoggedIn}`);
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login');
  const isOnRegisterPage = req.nextUrl.pathname.startsWith('/register');
  const isOnSetupPage = req.nextUrl.pathname.startsWith('/setup');

  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isApiWebhookRoute = req.nextUrl.pathname.startsWith('/api/plugins/webhook');

  if (isApiRoute) {
    // Whitelist core identity and SSO routes (verify, NextAuth primitives)
    if (isApiAuthRoute || isApiWebhookRoute) return;

    // Edge Defense: If it's an API route, check if they are trying to use a Bearer token
    // If they have a token, we MUST pass it down to the Node.js layer to verify the hash
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
       return; // Pass to Node
    }
    // If no Bearer token, they must be authenticated via NextAuth web session
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized: Edge perimeter rejected unauthenticated request." }, { status: 401 });
    }
    return; // Authenticated, pass to Node
  }

  if (isOnSetupPage) {
       // Expose setup to everyone. It has its own Node.js logic to bounce logged-in users away.
       return; 
  }

  if (isOnLoginPage || isOnRegisterPage) {
       if (req.nextUrl.searchParams.has('clearsession')) {
           return; // Let Node.js render the page so the client-side useEffect can execute signOut()
       }

    if (isLoggedIn) {
       return Response.redirect(new URL('/', req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
     return Response.redirect(new URL('/login', req.nextUrl));
  }
})

// Optionally, don't invoke Middleware on some paths
// MATCH ALL including /api, but exclude static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif)$).*)'],
}
