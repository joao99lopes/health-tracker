import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyRedirect } from "./routing.ts";

test("a visitor without a session cookie is sent to the login page", () => {
  assert.equal(proxyRedirect("/", false), "/login");
  assert.equal(proxyRedirect("/measurements/new", false), "/login");
});

test("the auth pages are open without a session cookie", () => {
  assert.equal(proxyRedirect("/login", false), null);
  assert.equal(proxyRedirect("/register", false), null);
  assert.equal(proxyRedirect("/forgot-password", false), null);
});

test("a session cookie lets app pages through to the server-side check", () => {
  assert.equal(proxyRedirect("/", true), null);
  assert.equal(proxyRedirect("/profile", true), null);
});

test("a cookie alone never sends the visitor away from an auth page", () => {
  // The cookie may belong to a session that no longer exists. Redirecting on
  // it would loop with the app layout, which does check the session.
  assert.equal(proxyRedirect("/login", true), null);
  assert.equal(proxyRedirect("/register", true), null);
});
