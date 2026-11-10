import { expect, test } from "@playwright/test";
import {
  historyCsv,
  importCsv,
  newSignedInUser,
  saveProfile,
  settle,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await newSignedInUser(page, "dashboard");
  await saveProfile(page);
  // 40 readings, one every three days: about four months of history.
  await importCsv(page, historyCsv(40));
});

test("the dashboard says how old the latest reading is and compares in one table", async ({
  page,
}) => {
  await page.goto("/");
  await settle(page);
  await expect(page.getByText("yesterday", { exact: true })).toBeVisible();

  // The value carries the unit, so the card's name does not repeat it.
  const weightCard = page.getByRole("button", { name: "Show Weight in the chart" });
  await expect(weightCard).toBeVisible();

  const comparisons = page.locator("section", {
    has: page.getByRole("heading", { name: "Comparisons" }),
  });
  await expect(comparisons.getByRole("columnheader", { name: "Latest vs first" })).toBeVisible();
  await expect(comparisons.getByRole("columnheader", { name: "1 month" })).toBeVisible();
  await expect(comparisons.getByRole("rowheader", { name: /Weight/ })).toBeVisible();

  // Picking another period relabels the column, without a page load.
  await page.getByRole("combobox", { name: "Period" }).last().click();
  await page.getByRole("option", { name: "3 months" }).click();
  await expect(comparisons.getByRole("columnheader", { name: "3 months" })).toBeVisible();
  await expect(page).toHaveURL(/cmp=3m/);
});

test("selects carry their choice in the server's HTML, not only after hydration", async ({
  page,
}) => {
  // The page streams (loading.tsx), so a browser without scripts never swaps
  // the content in; read what the server sent instead.
  const html = await (await page.request.get("/?period=3m")).text();
  const selected = [...html.matchAll(/data-slot="select-value"[^>]*>([^<]*)</g)].map(
    (match) => match[1],
  );
  expect(selected).toContain("Weight (kg)");
  expect(selected).toContain("3 months");
  expect(selected).not.toContain("");
});

test("a metric opens on its own page, over a period or chosen dates", async ({ page }) => {
  await page.goto("/");
  await settle(page);
  await page.getByRole("link", { name: "More on Weight" }).click();
  await expect(page).toHaveURL(/\/metrics\/weightKg$/);
  await expect(page.getByRole("heading", { name: "Weight (kg)", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Readings" })).toBeVisible();
  // One month back from yesterday, every three days: ten or eleven readings.
  const rows = page.getByRole("table").last().locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(10);

  await page.getByRole("combobox", { name: "Period" }).click();
  await page.getByRole("option", { name: "Choose dates…" }).click();
  const from = page.getByLabel("From", { exact: true });
  const to = page.getByLabel("To", { exact: true });
  await expect(from).toBeVisible();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);

  // Out of order: said so, and the last good range stays on screen.
  await from.fill("2099-01-01");
  await expect(page.getByText("The first day must be on or before the last.")).toBeVisible();

  // A range with no readings says so rather than drawing nothing.
  await from.fill("2000-01-01");
  await to.fill("2000-01-31");
  await expect(page.getByText("Not enough data yet.")).toBeVisible();
  await expect(page).toHaveURL(/from=2000-01-01&to=2000-01-31/);
});

test("an unknown metric is not found", async ({ page }) => {
  await page.goto("/metrics/kcal");
  await expect(page.getByText("Page not found.")).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test("no page scrolls sideways", async ({ page }) => {
    for (const path of ["/", "/measurements", "/measurements/new", "/metrics/weightKg", "/profile"]) {
      await page.goto(path);
      await settle(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
      // A card clips what overflows it, so the page alone can look fine
      // while a table's last column is cut off: check the tables too.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll("table")]
          .filter((table) => table.checkVisibility())
          .some((table) => table.scrollWidth > (table.parentElement?.clientWidth ?? 0) + 1),
      );
      expect(clipped, `${path}: a table is wider than its container`).toBe(false);
    }
  });

  test("the form's two buttons share one row above the navigation", async ({ page }) => {
    await page.goto("/measurements/new");
    await settle(page);
    const save = await page.getByRole("button", { name: "Save", exact: true }).boundingBox();
    const cancel = await page.getByRole("link", { name: "Cancel" }).boundingBox();
    expect(save && cancel).toBeTruthy();
    expect(Math.abs((save?.y ?? 0) - (cancel?.y ?? 0))).toBeLessThan(4);
  });
});
