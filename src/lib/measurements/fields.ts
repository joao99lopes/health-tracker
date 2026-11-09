/**
 * The measurement value fields, defined once, together with what each one
 * accepts.
 *
 * `measuredAt` and `heightCmAtMeasurement` are deliberately absent from the
 * value list: they are always required, so they are not "values" for the
 * at-least-one rule. BMI and the waist-to-height ratio are absent because they
 * are derived, never stored.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */
export const MEASUREMENT_VALUE_FIELDS = [
  "weightKg",
  "bodyFatPercent",
  "hydrationPercent",
  "musclePercent",
  "boneMassKg",
  "visceralFat",
  "abdominalCircumferenceCm",
] as const;

export type MeasurementValueField = (typeof MEASUREMENT_VALUE_FIELDS)[number];

/** The optional part of a measurement: every value the user may supply. */
export type MeasurementValues = {
  [K in MeasurementValueField]?: number | null;
};

/**
 * What one field accepts.
 *
 * `decimals` is the precision of the matching column in
 * prisma/schema.prisma - a value is rounded to it before being stored, so
 * what is validated is what is kept. The bounds are plausibility limits: they
 * are wide enough never to reject a real reading and narrow enough to catch a
 * mistyped one, and they always stay inside the column's range.
 */
export type MeasurementFieldSpec = {
  /** Which unit suffix to present the value with. */
  unit: "kg" | "%" | "cm" | "none";
  decimals: number;
  min: number;
  max: number;
};

export const MEASUREMENT_FIELD_SPECS: Record<
  MeasurementValueField,
  MeasurementFieldSpec
> = {
  // Decimal(5, 2)
  weightKg: { unit: "kg", decimals: 2, min: 1, max: 700 },
  // Decimal(4, 1), and a percentage of body mass
  bodyFatPercent: { unit: "%", decimals: 1, min: 0, max: 100 },
  hydrationPercent: { unit: "%", decimals: 1, min: 0, max: 100 },
  musclePercent: { unit: "%", decimals: 1, min: 0, max: 100 },
  // Decimal(4, 2)
  boneMassKg: { unit: "kg", decimals: 2, min: 0, max: 20 },
  // Int: a unitless index as consumer scales report it.
  visceralFat: { unit: "none", decimals: 0, min: 0, max: 60 },
  // Decimal(4, 1): waist circumference measured with a tape.
  abdominalCircumferenceCm: { unit: "cm", decimals: 1, min: 20, max: 300 },
};

/**
 * Longest note a measurement can carry, in characters. Matches the
 * `VarChar(500)` column of `Measurement.note`.
 */
export const NOTE_MAX_LENGTH = 500;

/**
 * Nothing was measured before this. A date below it is a typo, not history.
 */
export const EARLIEST_MEASURED_AT = "1900-01-01T00:00:00.000Z";
