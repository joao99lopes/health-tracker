import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/rules";
import { proxyRedirect } from "@/lib/auth/routing";

/**
 * Optimistic routing only.
 *
 * This checks whether a session cookie is present - not whether it is valid.
 * It exists to bounce signed-out visitors without rendering a protected page
 * first. Authorisation is enforced server-side in the (app) layout and in
 * every data query; never rely on this for access control. See
 * src/lib/auth/routing.ts for why it never redirects *away* from an auth page.
 */
export function proxy(request: NextRequest) {
  const target = proxyRedirect(
    request.nextUrl.pathname,
    request.cookies.has(SESSION_COOKIE),
  );
  if (target === null) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the public health probe, Next internals and static
  // files.
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
