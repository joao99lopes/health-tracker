import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECENT_SIGN_IN_SECONDS,
  SESSION_MAX_AGE_SECONDS,
  authErrorKey,
  decideAccountLink,
  isRecentSignIn,
  isSessionCurrent,
  normalisePrivateKey,
  sessionCookieOptions,
} from "./rules.ts";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const nowSeconds = NOW.getTime() / 1000;

test("a sign-in counts as recent for five minutes, allowing small clock skew", () => {
  assert.equal(isRecentSignIn(nowSeconds, NOW), true);
  assert.equal(isRecentSignIn(nowSeconds - RECENT_SIGN_IN_SECONDS, NOW), true);
  assert.equal(isRecentSignIn(nowSeconds - RECENT_SIGN_IN_SECONDS - 1, NOW), false);
  assert.equal(isRecentSignIn(nowSeconds + 30, NOW), true);
  assert.equal(isRecentSignIn(nowSeconds + 120, NOW), false);
});

test("a session signed in before sessions were ended is refused", () => {
  const endedAt = new Date("2026-11-09T12:00:00.900Z");
  assert.equal(isSessionCurrent(nowSeconds - 1, endedAt), false);
  // The new session minted in the same second as the change stays valid.
  assert.equal(isSessionCurrent(nowSeconds, endedAt), true);
  assert.equal(isSessionCurrent(nowSeconds - 1, null), true);
});

test("the cookie is httpOnly and lax, Secure only over HTTPS", () => {
  const lan = sessionCookieOptions("http://192.168.1.170:3000");
  assert.equal(lan.httpOnly, true);
  assert.equal(lan.sameSite, "lax");
  assert.equal(lan.secure, false);
  assert.equal(lan.maxAge, SESSION_MAX_AGE_SECONDS);
  assert.equal(sessionCookieOptions("https://health.example").secure, true);
});

test("a known Firebase uid is used as is", () => {
  assert.deepEqual(
    decideAccountLink({ byUid: { id: "u1" }, byEmail: null, emailVerified: false }),
    { action: "use", userId: "u1" },
  );
});

test("an unverified address never links or creates", () => {
  assert.deepEqual(
    decideAccountLink({
      byUid: null,
      byEmail: { id: "u1", firebaseUid: null },
      emailVerified: false,
    }),
    { action: "refuse", reason: "EMAIL_NOT_VERIFIED" },
  );
  assert.deepEqual(
    decideAccountLink({ byUid: null, byEmail: null, emailVerified: false }),
    { action: "refuse", reason: "EMAIL_NOT_VERIFIED" },
  );
});

test("a verified address links the pre-Firebase account with that email", () => {
  assert.deepEqual(
    decideAccountLink({
      byUid: null,
      byEmail: { id: "legacy", firebaseUid: null },
      emailVerified: true,
    }),
    { action: "link", userId: "legacy" },
  );
});

test("an address already linked to another Firebase account is refused", () => {
  assert.deepEqual(
    decideAccountLink({
      byUid: null,
      byEmail: { id: "u1", firebaseUid: "other-uid" },
      emailVerified: true,
    }),
    { action: "refuse", reason: "EMAIL_TAKEN" },
  );
});

test("a verified new address creates a user", () => {
  assert.deepEqual(
    decideAccountLink({ byUid: null, byEmail: null, emailVerified: true }),
    { action: "create" },
  );
});

test("Firebase error codes map to the messages the interface knows", () => {
  assert.equal(authErrorKey("auth/invalid-credential"), "invalidCredentials");
  assert.equal(authErrorKey("auth/user-not-found"), "invalidCredentials");
  assert.equal(authErrorKey("auth/email-already-in-use"), "emailInUse");
  assert.equal(authErrorKey("auth/weak-password"), "weakPassword");
  assert.equal(authErrorKey("auth/too-many-requests"), "tooManyRequests");
  assert.equal(authErrorKey("auth/network-request-failed"), "network");
  assert.equal(authErrorKey("auth/internal-error"), "failed");
  assert.equal(authErrorKey(undefined), "failed");
});

test("a private key copied from the JSON is turned back into PEM lines", () => {
  const pem = "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n";
  const escaped = pem.replaceAll("\n", "\\n");
  assert.equal(normalisePrivateKey(escaped), pem);
  assert.equal(normalisePrivateKey(`"${escaped}"`), pem);
  assert.equal(normalisePrivateKey(pem), pem);
});
