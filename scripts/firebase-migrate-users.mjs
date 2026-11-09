#!/usr/bin/env node
// One-off: moves accounts created before Firebase Auth onto Firebase.
//
// For each email given, it makes sure a Firebase account exists (created with
// the address marked verified - these users proved it to us already) and asks
// Firebase to send that address its "set a new password" email. Passwords
// themselves cannot move: Firebase cannot import the old scrypt hashes.
//
// Nothing in the app's database changes here. On the user's first sign-in the
// app links the Firebase account to the existing user row by email, keeping
// every profile and measurement (src/lib/auth/rules.ts, decideAccountLink).
//
// Usage (from the repository root, with Firebase variables in .env):
//
//   node scripts/firebase-migrate-users.mjs a@example.com b@example.com          # dry run
//   node scripts/firebase-migrate-users.mjs --apply a@example.com b@example.com  # do it
//
// The emails of existing users, from the Pi:
//   docker compose -f ~/health-tracker/deploy/compose.yaml exec -T db \
//     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select email from \"User\" where \"firebaseUid\" is null"'
//
// Reads FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FIREBASE_CLIENT_EMAIL and
// FIREBASE_PRIVATE_KEY (or FIREBASE_AUTH_EMULATOR_HOST) from the environment
// or ./.env.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

try {
  process.loadEnvFile();
} catch {
  // No .env: the environment must already hold the variables.
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. See .env.example.`);
    process.exit(2);
  }
  return value;
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const emails = [...new Set(args.filter((a) => !a.startsWith("--")).map((e) => e.trim().toLowerCase()))];
if (emails.length === 0) {
  console.error("Usage: node scripts/firebase-migrate-users.mjs [--apply] <email> [<email> ...]");
  process.exit(2);
}

const projectId = required("FIREBASE_PROJECT_ID");
const apiKey = required("FIREBASE_API_KEY");
const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST || null;

const app = emulator
  ? initializeApp({ projectId })
  : initializeApp({
      projectId,
      credential: cert({
        projectId,
        clientEmail: required("FIREBASE_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replaceAll("\\n", "\n"),
      }),
    });
const auth = getAuth(app);

const identityToolkit = emulator
  ? `http://${emulator}/identitytoolkit.googleapis.com/v1`
  : "https://identitytoolkit.googleapis.com/v1";

/** Firebase sends the email itself; nothing passes through this machine. */
async function sendPasswordReset(email) {
  const response = await fetch(`${identityToolkit}/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
  });
  if (!response.ok) {
    throw new Error(`sendOobCode answered ${response.status}: ${await response.text()}`);
  }
}

console.log(`${apply ? "Applying" : "Dry run"} - project ${projectId}${emulator ? ` (emulator ${emulator})` : ""}`);

let failures = 0;
for (const email of emails) {
  try {
    let user = await auth.getUserByEmail(email).catch((error) => {
      if (error?.code === "auth/user-not-found") return null;
      throw error;
    });
    if (user === null) {
      if (!apply) {
        console.log(`  ${email}: would create a Firebase account and send a reset email`);
        continue;
      }
      user = await auth.createUser({ email, emailVerified: true });
      console.log(`  ${email}: created Firebase account ${user.uid}`);
    } else {
      console.log(`  ${email}: Firebase account ${user.uid} already exists`);
      if (!user.emailVerified && apply) {
        await auth.updateUser(user.uid, { emailVerified: true });
        console.log(`  ${email}: marked verified`);
      }
    }
    if (apply) {
      await sendPasswordReset(email);
      console.log(`  ${email}: password reset email sent`);
    } else {
      console.log(`  ${email}: would send a reset email`);
    }
  } catch (error) {
    failures++;
    console.error(`  ${email}: FAILED - ${error.message}`);
  }
}

if (!apply) {
  console.log("Nothing changed. Re-run with --apply to do it.");
}
process.exit(failures > 0 ? 1 : 0);
