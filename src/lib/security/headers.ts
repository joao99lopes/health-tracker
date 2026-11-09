/**
 * HTTP security headers sent with every response.
 *
 * Read by next.config.ts. Kept here, as plain data, so it can be unit-tested
 * without starting Next.
 *
 * The app is served over plain HTTP on the LAN, which shapes two omissions:
 *
 * - No `Strict-Transport-Security`: it is ignored over HTTP, and pinning
 *   HTTPS for the LAN address would lock users out if it were ever honoured.
 * - No `upgrade-insecure-requests`: it would make the browser fetch the app's
 *   own scripts and styles over HTTPS, where nothing is listening.
 *
 * Both belong here once the app is served over HTTPS.
 *
 * The CSP follows Next's "without nonces" recipe. Inline scripts are allowed
 * because Next injects its bootstrap and the theme script inline; nonces would
 * remove that need, but every page here is already dynamic and the threat
 * model (one or two users on a home LAN) does not justify the extra moving
 * part. Recharts and Radix set inline styles, hence `style-src 'unsafe-inline'`.
 */

export type SecurityHeader = { key: string; value: string };

/**
 * Where the browser talks to Firebase Auth: the sign-in API and the token
 * service. Nothing else leaves this origin.
 */
export const FIREBASE_AUTH_ORIGINS = [
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
] as const;

type CspOptions = {
  /** The Firebase Auth emulator (`host:port`), development only. */
  authEmulatorHost?: string | null;
};

function contentSecurityPolicy(isDevelopment: boolean, options: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React's development build evaluates code for debugging; production does not.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:"],
    // next/font serves its files from this origin.
    "font-src": ["'self'"],
    // Firebase Auth, the emulator when one is configured, and the WebSocket
    // `next dev` pushes hot reloads over (production has none).
    "connect-src": [
      "'self'",
      ...FIREBASE_AUTH_ORIGINS,
      ...(options.authEmulatorHost ? [`http://${options.authEmulatorHost}`] : []),
      ...(isDevelopment ? ["ws:"] : []),
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

export function securityHeaders(
  isDevelopment: boolean,
  options: CspOptions = {},
): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(isDevelopment, options),
    },
    // Superseded by `frame-ancestors` in browsers that support CSP; kept for
    // those that do not.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
