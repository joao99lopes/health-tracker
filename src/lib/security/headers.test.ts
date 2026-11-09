import { test } from "node:test";
import assert from "node:assert/strict";
import { securityHeaders } from "./headers.ts";

function header(name: string, isDevelopment = false): string {
  const found = securityHeaders(isDevelopment).find((h) => h.key === name);
  assert.ok(found, `missing ${name}`);
  return found.value;
}

function directive(csp: string, name: string): string[] {
  const entry = csp.split("; ").find((d) => d.startsWith(`${name} `));
  assert.ok(entry, `missing CSP directive ${name}`);
  return entry.split(" ").slice(1);
}

test("forbids framing, both through CSP and X-Frame-Options", () => {
  assert.deepEqual(
    directive(header("Content-Security-Policy"), "frame-ancestors"),
    ["'none'"],
  );
  assert.equal(header("X-Frame-Options"), "DENY");
});

test("production CSP does not allow eval", () => {
  const scripts = directive(header("Content-Security-Policy"), "script-src");
  assert.ok(!scripts.includes("'unsafe-eval'"));
});

test("development CSP allows eval for React's debugging build", () => {
  const scripts = directive(
    header("Content-Security-Policy", true),
    "script-src",
  );
  assert.ok(scripts.includes("'unsafe-eval'"));
});

test("only development may open WebSockets, for hot reload", () => {
  assert.ok(
    directive(header("Content-Security-Policy", true), "connect-src").includes("ws:"),
  );
  assert.ok(
    !directive(header("Content-Security-Policy"), "connect-src").includes("ws:"),
  );
});

test("everything is restricted to the app's own origin", () => {
  const csp = header("Content-Security-Policy");
  for (const name of ["default-src", "font-src", "form-action"]) {
    assert.deepEqual(directive(csp, name), ["'self'"], name);
  }
  assert.deepEqual(directive(csp, "object-src"), ["'none'"]);
});

test("does not upgrade requests or pin HTTPS while served over HTTP", () => {
  assert.ok(!header("Content-Security-Policy").includes("upgrade-insecure-requests"));
  assert.ok(
    !securityHeaders(false).some((h) => h.key === "Strict-Transport-Security"),
  );
});

test("sends nosniff and a same-origin referrer policy", () => {
  assert.equal(header("X-Content-Type-Options"), "nosniff");
  assert.equal(header("Referrer-Policy"), "same-origin");
});

test("the browser may reach this origin and Firebase Auth, nothing else", () => {
  assert.deepEqual(directive(header("Content-Security-Policy"), "connect-src"), [
    "'self'",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
  ]);
});

test("the Auth emulator is reachable only when configured", () => {
  const withEmulator = securityHeaders(false, { authEmulatorHost: "localhost:9099" }).find(
    (h) => h.key === "Content-Security-Policy",
  );
  assert.ok(withEmulator);
  assert.ok(directive(withEmulator.value, "connect-src").includes("http://localhost:9099"));
  assert.ok(
    !directive(header("Content-Security-Policy"), "connect-src").some((s) => s.startsWith("http://")),
  );
});
