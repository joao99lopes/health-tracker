/**
 * BMI classification.
 *
 * ---------------------------------------------------------------------------
 * THE THRESHOLDS BELOW ARE THE ONLY COPY IN THE CODEBASE. Change them here or
 * nowhere.
 *
 * Source: World Health Organization, "Obesity: preventing and managing the
 * global epidemic. Report of a WHO Consultation", WHO Technical Report Series
 * 894 (Geneva, 2000), Table 2.1 "Classification of overweight in adults
 * according to BMI"; restated in the WHO fact sheet "Obesity and overweight"
 * (https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight).
 *
 *   BMI < 18.5          underweight
 *   18.5 <= BMI < 25    normal range
 *   25 <= BMI < 30      pre-obese (commonly "overweight")
 *   30 <= BMI < 35      obese class I
 *   35 <= BMI < 40      obese class II
 *   BMI >= 40           obese class III
 *
 * Scope, stated as fact and not as advice: these cut-off points are defined
 * for adults (18 and over). They are not valid for children or adolescents,
 * who are classified against age- and sex-specific growth references, and BMI
 * does not distinguish fat from muscle or bone. This module reports which band
 * a number falls into. It does not interpret it, and nothing in this project
 * derives a recommendation from it.
 * ---------------------------------------------------------------------------
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

export const BMI_CATEGORIES = [
  "UNDERWEIGHT",
  "NORMAL",
  "PRE_OBESE",
  "OBESE_I",
  "OBESE_II",
  "OBESE_III",
] as const;

export type BmiCategory = (typeof BMI_CATEGORIES)[number];

/** The age at which the WHO adult cut-off points start to apply. */
export const BMI_ADULT_MIN_AGE_YEARS = 18;

export type BmiBand = {
  category: BmiCategory;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound; null for the open-ended top band. */
  max: number | null;
};

/**
 * The bands, in ascending order and contiguous: each one's `max` is the next
 * one's `min`, so every finite BMI falls into exactly one.
 */
export const BMI_BANDS: readonly BmiBand[] = [
  { category: "UNDERWEIGHT", min: 0, max: 18.5 },
  { category: "NORMAL", min: 18.5, max: 25 },
  { category: "PRE_OBESE", min: 25, max: 30 },
  { category: "OBESE_I", min: 30, max: 35 },
  { category: "OBESE_II", min: 35, max: 40 },
  { category: "OBESE_III", min: 40, max: null },
];

/**
 * The band a BMI falls into, or null when there is no BMI to classify.
 *
 * Boundaries belong to the band above: 25 is PRE_OBESE, not NORMAL.
 */
export function classifyBmi(bmi: number | null | undefined): BmiCategory | null {
  if (typeof bmi !== "number" || !Number.isFinite(bmi) || bmi <= 0) {
    return null;
  }
  const band = BMI_BANDS.find(
    (candidate) => bmi >= candidate.min && (candidate.max === null || bmi < candidate.max),
  );
  return band?.category ?? null;
}

/**
 * Whether the adult thresholds apply to someone of this age.
 *
 * Callers that know the age can use this to decide whether to show a
 * classification at all; `classifyBmi` itself takes no view on age.
 */
export function isAdultBmiApplicable(ageYears: number | null): boolean {
  return ageYears !== null && ageYears >= BMI_ADULT_MIN_AGE_YEARS;
}
