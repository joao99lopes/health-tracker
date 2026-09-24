/**
 * Waist-to-height ratio calculation.
 *
 * Like BMI it is never stored: it is derived from the waist circumference and
 * the height that was recorded *with that measurement*, so past results stay
 * stable when the profile's current height changes.
 *
 * Classification lives in ./waist-to-height-classification.ts - this module
 * only does arithmetic.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/**
 * Digits kept when presenting a ratio. BMI shows one decimal because its bands
 * are a few units wide; these bands are a tenth wide (0.4, 0.5, 0.6), so two
 * decimals are the equivalent resolution. Classification always uses the exact
 * value.
 */
export const WAIST_TO_HEIGHT_DISPLAY_DECIMALS = 2;

function isUsable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * `waistCm / heightCm`, or null when it cannot be computed.
 *
 * Both are in centimetres, so the ratio is unitless. Null - rather than 0 or
 * NaN - is returned for a missing, zero, negative or non-finite input.
 */
export function calculateWaistToHeightRatio(
  waistCm: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (!isUsable(waistCm) || !isUsable(heightCm)) {
    return null;
  }
  const ratio = waistCm / heightCm;
  return Number.isFinite(ratio) ? ratio : null;
}

/** A ratio rounded for display. Classification always uses the exact value. */
export function roundWaistToHeightRatio(
  ratio: number | null,
  decimals: number = WAIST_TO_HEIGHT_DISPLAY_DECIMALS,
): number | null {
  if (ratio === null || !Number.isFinite(ratio)) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(ratio * factor) / factor;
}
