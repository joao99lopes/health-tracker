import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  historyCsv,
  importCsv,
  newSignedInUser,
  saveProfile,
  settle,
} from "./helpers";

/** WCAG 2.1 A and AA, the bar the app was last audited against. */
async function audit(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await settle(page);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    path,
  ).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("signed-out pages pass axe", async ({ page }) => {
      await audit(page, "/login");
      await audit(page, "/register");
    });

    test("signed-in pages pass axe", async ({ page }) => {
      await newSignedInUser(page, `axe-${colorScheme}`);
      await saveProfile(page);
      await importCsv(page, historyCsv(20));
      for (const path of [
        "/",
        "/measurements",
        "/measurements/new",
        "/metrics/weightKg",
        "/profile",
        "/report",
      ]) {
        await audit(page, path);
      }
    });
  });
}
