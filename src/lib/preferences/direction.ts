import { METRICS, type Metric } from "../measurements/metrics.ts";
import type { ChangeDirection } from "../measurements/comparison.ts";

/**
 * Which way the reader would like each metric to move.
 *
 * This is a *presentation preference* and nothing else. It carries no target,
 * no goal and no recommendation: it only tells the interface which way to read
 * a change the user has already recorded, so that a fall in weight can be
 * shown as movement towards what they asked for rather than as a bare minus
 * sign. The application still never says a value is good, healthy or wrong.
 *
 * Only the current preference is kept. Changing it re-reads the whole history
 * immediately, because nothing derived from it is stored.
 *
 * This module is pure: no Prisma, no React, no environment access.
 */

/** The values a preference can take. Must match `MetricDirection` in prisma/schema.prisma. */
export const METRIC_DIRECTIONS = ["decrease", "indifferent", "increase"] as const;

export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

/** No preference: the reader has not said which way they would like this to go. */
export const DEFAULT_METRIC_DIRECTION: MetricDirection = "indifferent";

export function isMetricDirection(value: string): value is MetricDirection {
  return (METRIC_DIRECTIONS as readonly string[]).includes(value);
}

/** One preference per metric, including the derived ones. */
export type DirectionPreferences = Record<Metric, MetricDirection>;

export const DEFAULT_DIRECTION_PREFERENCES: DirectionPreferences =
  Object.fromEntries(
    METRICS.map((metric) => [metric, DEFAULT_METRIC_DIRECTION]),
  ) as DirectionPreferences;

/**
 * How a change should be presented.
 *
 * `"positive"` and `"negative"` mean "with" and "against" the direction the
 * reader picked - not healthy and unhealthy. `"neutral"` is the app's default
 * voice and the only tone used where no preference has been expressed.
 */
export type ChangeTone = "positive" | "negative" | "neutral";

/**
 * The tone for one change under one preference.
 *
 * An unchanged value takes the tone of the preference itself rather than
 * flipping to neutral, so a card does not change colour just because a reading
 * happened to repeat. With no preference every change is neutral.
 */
export function changeTone(
  preference: MetricDirection,
  change: ChangeDirection,
): ChangeTone {
  if (preference === "indifferent") {
    return "neutral";
  }
  if (change === "same") {
    return "positive";
  }
  const wanted: ChangeDirection = preference === "increase" ? "up" : "down";
  return change === wanted ? "positive" : "negative";
}
