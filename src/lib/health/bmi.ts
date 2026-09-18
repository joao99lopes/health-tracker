/**
 * BMI calculation.
 *
 * BMI is never stored: it is derived from the weight and the height that was
 * recorded *with that measurement*, so past results stay stable when the
 * profile's current height changes.
 *
 * Classification lives in ./bmi-classification.ts - this module only does
 * arithmetic.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** Digits kept when presenting a BMI. The stored inputs are exact; this is not. */
export const BMI_DISPLAY_DECIMALS = 1;

function isUsable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * `weightKg / (heightCm / 100)^2`, or null when it cannot be computed.
 *
 * Null - rather than 0 or NaN - is returned for a missing, zero, negative or
 * non-finite input, so a caller has to handle "no BMI" explicitly instead of
 * displaying a misleading number.
 */
export function calculateBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (!isUsable(weightKg) || !isUsable(heightCm)) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Number.isFinite(bmi) ? bmi : null;
}

/** A BMI rounded for display. Classification always uses the exact value. */
export function roundBmi(
  bmi: number | null,
  decimals: number = BMI_DISPLAY_DECIMALS,
): number | null {
  if (bmi === null || !Number.isFinite(bmi)) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(bmi * factor) / factor;
}
