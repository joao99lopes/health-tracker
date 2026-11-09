/**
 * The proxy's routing decision, as a pure function so it can be tested.
 *
 * The proxy only sees whether a session cookie *exists*, never whether it is
 * valid. That is enough to send a visitor with no cookie at all to the login
 * page early. It is not enough to send someone *away* from the login page: a
 * cookie whose session was deleted on the server (signed out elsewhere, account
 * removed, database restored) would bounce between `/login` (cookie present →
 * `/`) and the app layout (session invalid → `/login`) forever. Leaving an
 * auth page is therefore decided server-side, by the (auth) layout, with the
 * session actually checked.
 *
 * This module is pure: no Next, no environment access.
 */

/** Pages a signed-out visitor may open. */
export const AUTH_PAGES: readonly string[] = [
  "/login",
  "/register",
  "/forgot-password",
];

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

/** Where to send the request instead, or null to let it through. */
export function proxyRedirect(
  pathname: string,
  hasSessionCookie: boolean,
): string | null {
  if (!hasSessionCookie && !isAuthPage(pathname)) {
    return "/login";
  }
  return null;
}
