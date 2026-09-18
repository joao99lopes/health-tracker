import assert from "node:assert/strict";
import { test } from "node:test";
import { HEIGHT_CM_MAX, HEIGHT_CM_MIN, NAME_MAX_LENGTH } from "./fields.ts";
import { parseHeightCm, parseProfileInput } from "./validation.ts";

const NOW = new Date("2026-09-18T12:00:00.000Z");

function input(overrides: Partial<Parameters<typeof parseProfileInput>[0]> = {}) {
  return {
    name: "Ana",
    birthDate: "1990-05-04",
    sex: "FEMALE",
    heightCm: "167.5",
    language: "pt",
    ...overrides,
  };
}

test("accepts a complete profile", () => {
  const result = parseProfileInput(input(), NOW);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.profile, {
    name: "Ana",
    birthDate: "1990-05-04",
    sex: "FEMALE",
    heightCm: 167.5,
    language: "pt",
  });
});

test("name is optional and blank becomes null", () => {
  const result = parseProfileInput(input({ name: "   " }), NOW);
  assert.deepEqual(result.issues, []);
  assert.equal(result.profile?.name, null);
});

test("rejects an over-long name", () => {
  const result = parseProfileInput(
    input({ name: "a".repeat(NAME_MAX_LENGTH + 1) }),
    NOW,
  );
  assert.deepEqual(result.issues, ["NAME_TOO_LONG"]);
  assert.equal(result.profile, undefined);
});

test("requires a date of birth and rejects impossible ones", () => {
  assert.deepEqual(parseProfileInput(input({ birthDate: "" }), NOW).issues, [
    "BIRTH_DATE_REQUIRED",
  ]);
  assert.deepEqual(
    parseProfileInput(input({ birthDate: "2025-02-31" }), NOW).issues,
    ["BIRTH_DATE_INVALID"],
  );
  assert.deepEqual(
    parseProfileInput(input({ birthDate: "2026-09-19" }), NOW).issues,
    ["BIRTH_DATE_IN_FUTURE"],
  );
  assert.deepEqual(
    parseProfileInput(input({ birthDate: "1899-12-31" }), NOW).issues,
    ["BIRTH_DATE_TOO_OLD"],
  );
});

test("today is a valid date of birth", () => {
  const result = parseProfileInput(input({ birthDate: "2026-09-18" }), NOW);
  assert.deepEqual(result.issues, []);
});

test("rejects an unknown sex or language", () => {
  assert.deepEqual(parseProfileInput(input({ sex: "" }), NOW).issues, [
    "SEX_REQUIRED",
  ]);
  assert.deepEqual(parseProfileInput(input({ sex: "YES" }), NOW).issues, [
    "SEX_INVALID",
  ]);
  assert.deepEqual(parseProfileInput(input({ language: "de" }), NOW).issues, [
    "LANGUAGE_INVALID",
  ]);
});

test("height accepts both decimal separators", () => {
  assert.equal(parseHeightCm("167,5"), 167.5);
  assert.equal(parseHeightCm("167.5"), 167.5);
  assert.equal(parseHeightCm("167"), 167);
  assert.equal(parseHeightCm("abc"), null);
  assert.equal(parseHeightCm(""), null);
});

test("height is rounded to the stored precision", () => {
  const result = parseProfileInput(input({ heightCm: "167,46" }), NOW);
  assert.equal(result.profile?.heightCm, 167.5);
});

test("rejects a missing, unparseable or implausible height", () => {
  assert.deepEqual(parseProfileInput(input({ heightCm: "" }), NOW).issues, [
    "HEIGHT_REQUIRED",
  ]);
  assert.deepEqual(parseProfileInput(input({ heightCm: "tall" }), NOW).issues, [
    "HEIGHT_INVALID",
  ]);
  assert.deepEqual(
    parseProfileInput(input({ heightCm: String(HEIGHT_CM_MIN - 1) }), NOW)
      .issues,
    ["HEIGHT_OUT_OF_RANGE"],
  );
  assert.deepEqual(
    parseProfileInput(input({ heightCm: String(HEIGHT_CM_MAX + 1) }), NOW)
      .issues,
    ["HEIGHT_OUT_OF_RANGE"],
  );
});

test("reports every problem at once", () => {
  const result = parseProfileInput(
    { name: "", birthDate: "", sex: "", heightCm: "", language: "" },
    NOW,
  );
  assert.deepEqual(result.issues, [
    "BIRTH_DATE_REQUIRED",
    "SEX_REQUIRED",
    "HEIGHT_REQUIRED",
    "LANGUAGE_INVALID",
  ]);
});
