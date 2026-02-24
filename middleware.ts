export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login, /register (auth pages)
     * - /api/auth (next-auth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, static files
     */
    "/((?!login|register|api/auth|_next|favicon\\.ico|.*\\.svg$).*)",
  ],
};
