import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic routing only.
 *
 * This checks whether a session cookie is present - not whether it is valid.
 * It exists to bounce signed-out visitors without rendering a protected page
 * first. Authorisation is enforced server-side in the (app) layout and in
 * every data query; never rely on this for access control.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = getSessionCookie(request) !== null;
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!hasSessionCookie && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasSessionCookie && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except the auth endpoints, Next internals and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
