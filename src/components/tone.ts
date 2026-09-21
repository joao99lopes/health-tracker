import type {
  ChangeTone,
  MetricDirection,
} from "@/lib/preferences/direction";

/**
 * How a tone and a direction preference are painted.
 *
 * Kept next to the components rather than in the calculation layer: these are
 * class names and CSS variables, and nothing outside the interface should have
 * an opinion about them.
 *
 * Colour is never the only signal. Every place that uses these also keeps its
 * arrow and its number, so the meaning survives a colour-blind reader, a
 * printout and a screen reader alike.
 */

/** Text colour for a change, under the reader's preference for that metric. */
export const TONE_TEXT_CLASS: Record<ChangeTone, string> = {
  positive: "text-positive",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

/**
 * The single colour a chart is drawn in.
 *
 * Two distinguishable hues from the existing palette, chosen so neither reads
 * as approval or alarm: the line says which way the reader asked to go, not
 * whether the numbers are good. With no preference the chart keeps the
 * interface's default accent, unchanged from before.
 */
export const DIRECTION_CHART_COLOR: Record<MetricDirection, string> = {
  decrease: "var(--chart-2)",
  indifferent: "var(--chart-1)",
  increase: "var(--chart-4)",
};
