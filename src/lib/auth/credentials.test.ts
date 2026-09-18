import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEmail } from "./email.ts";
import {
  PASSWORD_MIN_LENGTH,
  isPlausibleEmail,
  validateCredentials,
} from "./credentials.ts";

const validPassword = "a".repeat(PASSWORD_MIN_LENGTH);

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Joao@Example.COM "), "joao@example.com");
});

test("normalizeEmail leaves dots and plus tags alone", () => {
  // Provider-specific aliasing is not ours to assume.
  assert.equal(normalizeEmail("a.b+tag@gmail.com"), "a.b+tag@gmail.com");
});

test("isPlausibleEmail accepts an ordinary address", () => {
  assert.equal(isPlausibleEmail("joao@example.com"), true);
});

test("isPlausibleEmail rejects addresses without a domain dot", () => {
  assert.equal(isPlausibleEmail("joao@localhost"), false);
});

test("isPlausibleEmail rejects addresses with spaces or no @", () => {
  assert.equal(isPlausibleEmail("joao example.com"), false);
  assert.equal(isPlausibleEmail("joao at example.com"), false);
});

test("validateCredentials accepts a good pair", () => {
  assert.deepEqual(
    validateCredentials({ email: "joao@example.com", password: validPassword }),
    [],
  );
});

test("validateCredentials reports a missing email", () => {
  assert.deepEqual(
    validateCredentials({ email: "   ", password: validPassword }),
    ["EMAIL_REQUIRED"],
  );
});

test("validateCredentials reports a short password", () => {
  assert.deepEqual(
    validateCredentials({
      email: "joao@example.com",
      password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
    }),
    ["PASSWORD_TOO_SHORT"],
  );
});

test("validateCredentials reports both problems at once", () => {
  assert.deepEqual(validateCredentials({ email: "nope", password: "short" }), [
    "EMAIL_INVALID",
    "PASSWORD_TOO_SHORT",
  ]);
});
