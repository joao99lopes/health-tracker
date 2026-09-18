import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { normalizeEmail } from "@/lib/auth/email";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/credentials";

/**
 * Authentication.
 *
 * Email and password only - no social login, no password reset, no email
 * verification (see CLAUDE.md). Sessions are database-backed and carried in an
 * httpOnly cookie; better-auth hashes passwords with scrypt.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // Deliberately off: email verification is a later phase.
    requireEmailVerification: false,
    minPasswordLength: PASSWORD_MIN_LENGTH,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh at most once a day
  },

  // Last line of defence for email normalisation: whatever path creates or
  // updates a user, the stored address is canonical, so the unique index
  // actually prevents duplicate accounts.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, email: normalizeEmail(user.email) },
        }),
      },
      update: {
        before: async (user) => ({
          data: user.email
            ? { ...user, email: normalizeEmail(user.email) }
            : user,
        }),
      },
    },
  },

  // Must stay last: lets server actions set the session cookie.
  plugins: [nextCookies()],
});
