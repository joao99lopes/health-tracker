/**
 * Profile field vocabulary and bounds, defined once.
 *
 * `SEXES` must match the `Sex` enum in prisma/schema.prisma. It is repeated
 * here rather than imported from the generated client so that this module
 * stays pure - the validation it feeds runs in the browser and under the Node
 * test runner, neither of which has Prisma.
 */
export const SEXES = ["FEMALE", "MALE", "OTHER"] as const;

export type Sex = (typeof SEXES)[number];

export function isSex(value: string): value is Sex {
  return (SEXES as readonly string[]).includes(value);
}

/** The optional display name; the column is unbounded, the form is not. */
export const NAME_MAX_LENGTH = 80;

/**
 * Plausible human heights, in centimetres. The upper bound also keeps the
 * value inside the column's Decimal(5, 1).
 */
export const HEIGHT_CM_MIN = 50;
export const HEIGHT_CM_MAX = 260;

/** Height is stored to one decimal place, as scales and tapes report it. */
export const HEIGHT_CM_DECIMALS = 1;

/** Nobody alive was born earlier; anything before this is a typo. */
export const EARLIEST_BIRTH_DATE = "1900-01-01";
