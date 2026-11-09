import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJsonExport, exportFileName } from "./json.ts";

const BASE = {
  heightCmAtMeasurement: 178,
  note: null,
  weightKg: null,
  bodyFatPercent: null,
  hydrationPercent: null,
  musclePercent: null,
  boneMassKg: null,
  visceralFat: null,
  abdominalCircumferenceCm: null,
};

test("the JSON export carries the account, profile and measurements", () => {
  const result = buildJsonExport({
    exportedAt: new Date("2026-11-09T10:00:00Z"),
    email: "a@example.test",
    profile: null,
    measurements: [
      { ...BASE, measuredAt: new Date("2026-09-20T00:00:00Z"), weightKg: 81 },
      { ...BASE, measuredAt: new Date("2026-09-10T00:00:00Z"), weightKg: 80 },
    ],
  });
  assert.equal(result.formatVersion, 1);
  assert.equal(result.exportedAt, "2026-11-09T10:00:00.000Z");
  assert.deepEqual(result.account, { email: "a@example.test" });
  assert.equal(result.profile, null);
  assert.deepEqual(
    result.measurements.map((m) => [m.measuredAt, m.weightKg]),
    [
      ["2026-09-10T00:00:00.000Z", 80],
      ["2026-09-20T00:00:00.000Z", 81],
    ],
  );
});

test("a measurement in the JSON export has no id or derived values", () => {
  const [entry] = buildJsonExport({
    exportedAt: new Date(),
    email: "a@example.test",
    profile: null,
    measurements: [{ ...BASE, measuredAt: new Date(), weightKg: 80 }],
  }).measurements;
  assert.ok(entry);
  assert.deepEqual(Object.keys(entry).sort(), [
    "abdominalCircumferenceCm",
    "bodyFatPercent",
    "boneMassKg",
    "heightCmAtMeasurement",
    "hydrationPercent",
    "measuredAt",
    "musclePercent",
    "note",
    "visceralFat",
    "weightKg",
  ]);
});

test("export file names carry the UTC date and extension", () => {
  const at = new Date("2026-09-18T23:30:00Z");
  assert.equal(exportFileName(at, "csv"), "health-tracker-2026-09-18.csv");
  assert.equal(exportFileName(at, "json"), "health-tracker-2026-09-18.json");
});
