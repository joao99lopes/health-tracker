"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client. Talks to the route handler under /api/auth.
 *
 * The session cookie is httpOnly, so the browser never reads it directly - the
 * client asks the server instead.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
