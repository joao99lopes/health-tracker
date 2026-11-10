import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDraft, serializeDraft, type MeasurementDraft } from "./draft.ts";
import { emptyFormValues } from "./form.ts";

function draft(overrides: Partial<MeasurementDraft> = {}): MeasurementDraft {
  return { values: emptyFormValues(), note: "", measuredAt: null, ...overrides };
}

test("an empty form is not worth keeping", () => {
  assert.equal(serializeDraft(draft()), null);
  assert.equal(serializeDraft(draft({ measuredAt: "2026-11-10T08:00" })), null);
});

test("a typed value or note round-trips", () => {
  const typed = draft({
    values: { ...emptyFormValues(), weightKg: "68,4" },
    note: "After breakfast",
    measuredAt: "2026-11-10T08:00",
  });
  assert.deepEqual(parseDraft(serializeDraft(typed)), typed);
});

test("nothing stored, or something that is not a draft, reads as no draft", () => {
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft("not json"), null);
  assert.equal(parseDraft("[]"), null);
  assert.equal(parseDraft(JSON.stringify({ values: {}, note: "" })), null);
});

test("a field of the wrong type or length invalidates the whole draft", () => {
  const values = { ...emptyFormValues(), weightKg: 68 };
  assert.equal(parseDraft(JSON.stringify({ values, note: "", measuredAt: null })), null);
  const long = { ...emptyFormValues(), weightKg: "9".repeat(100) };
  assert.equal(
    parseDraft(JSON.stringify({ values: long, note: "", measuredAt: null })),
    null,
  );
});
