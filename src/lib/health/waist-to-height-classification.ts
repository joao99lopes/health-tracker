/**
 * Waist-to-height ratio classification.
 *
 * ---------------------------------------------------------------------------
 * THE THRESHOLDS BELOW ARE THE ONLY COPY IN THE CODEBASE. Change them here or
 * nowhere.
 *
 * Boundary values 0.4, 0.5 and 0.6, as proposed in: Ashwell M, Gibson S.
 * "Waist-to-height ratio as an indicator of 'early health risk': simpler and
 * more predictive than using a 'matrix' based on BMI and waist
 * circumference". BMJ Open 2016;6:e010159. doi:10.1136/bmjopen-2015-010159.
 * The same boundaries are used for adults by NICE (UK), guideline NG246
 * "Overweight and obesity management" (2025).
 *
 *   ratio < 0.40           low
 *   0.40 <= ratio < 0.50   generally healthy range
 *   0.50 <= ratio < 0.60   increased
 *   ratio >= 0.60          high
 *
 * Scope, stated as fact and not as advice: these are screening reference
 * bands for adults, not a diagnosis. This module reports which band a number
 * falls into. It does not interpret it, and nothing in this project derives a
 * recommendation from it.
 * ---------------------------------------------------------------------------
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export const WAIST_TO_HEIGHT_CATEGORIES = [
  "LOW",
  "HEALTHY",
  "INCREASED",
  "HIGH",
] as const;

export type WaistToHeightCategory = (typeof WAIST_TO_HEIGHT_CATEGORIES)[number];

export type WaistToHeightBand = {
  category: WaistToHeightCategory;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound; null for the open-ended top band. */
  max: number | null;
};

/**
 * The bands, in ascending order and contiguous: each one's `max` is the next
 * one's `min`, so every positive ratio falls into exactly one.
 */
export const WAIST_TO_HEIGHT_BANDS: readonly WaistToHeightBand[] = [
  { category: "LOW", min: 0, max: 0.4 },
  { category: "HEALTHY", min: 0.4, max: 0.5 },
  { category: "INCREASED", min: 0.5, max: 0.6 },
  { category: "HIGH", min: 0.6, max: null },
];

/**
 * The band a ratio falls into, or null when there is no ratio to classify.
 *
 * Boundaries belong to the band above: 0.5 is INCREASED, not HEALTHY.
 */
export function classifyWaistToHeightRatio(
  ratio: number | null | undefined,
): WaistToHeightCategory | null {
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio <= 0) {
    return null;
  }
  const band = WAIST_TO_HEIGHT_BANDS.find(
    (candidate) =>
      ratio >= candidate.min && (candidate.max === null || ratio < candidate.max),
  );
  return band?.category ?? null;
}
