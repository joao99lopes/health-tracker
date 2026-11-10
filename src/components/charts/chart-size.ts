/**
 * The chart's height, shared by the chart and by every box that stands in
 * for it (before hydration, while Recharts loads, the empty state), so
 * nothing on the page jumps when the chart arrives.
 *
 * Its own module so the stand-ins can use it without importing the chart -
 * and with it Recharts.
 */
export const CHART_HEIGHT = "h-60 w-full sm:h-72 lg:h-80";
