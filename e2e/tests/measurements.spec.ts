import { expect, test, type Page } from "@playwright/test";
import { newSignedInUser, saveProfile, settle } from "./helpers";

async function openNewForm(page: Page): Promise<void> {
  await page.goto("/measurements/new");
  await settle(page);
}

test.beforeEach(async ({ page }) => {
  await newSignedInUser(page, "measure");
  await saveProfile(page);
});

test("adding a measurement records now, confirms once and offers the next", async ({
  page,
}) => {
  await openNewForm(page);
  // The date is folded away as "Now"; the keyboard opens on the first value.
  await expect(page.getByText("Now", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change the date and time" })).toBeVisible();
  await expect(page.getByLabel("Weight (kg)")).toBeFocused();

  await page.keyboard.type("68,4");
  await page.keyboard.press("Enter");
  // Enter moves to the next value instead of submitting.
  await expect(page.getByLabel("Body fat (%)")).toBeFocused();
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByText("Measurement added.")).toBeVisible();
  // The "saved" mark is taken out of the address, so a reload is quiet.
  await expect(page).toHaveURL(/\/measurements\/[0-9a-f-]{36}$/);
  await page.reload();
  await expect(page.getByText("Measurement added.")).toHaveCount(0);
  await expect(page.getByText("68.40 kg")).toBeVisible();
});

test("the add-another link opens a fresh form", async ({ page }) => {
  await openNewForm(page);
  await page.getByLabel("Weight (kg)").fill("70");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: "Add another" }).click();
  await expect(page).toHaveURL(/\/measurements\/new$/);
  await expect(page.getByLabel("Weight (kg)")).toHaveValue("");
});

test("a form with no value is refused before it is sent", async ({ page }) => {
  await openNewForm(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Enter at least one measurement value.")).toBeVisible();
});

test("a lost connection is reported and the values are kept to try again", async ({
  page,
}) => {
  await openNewForm(page);
  await page.getByLabel("Weight (kg)").fill("71.2");

  // Server actions are POSTs to the page's own address.
  await page.route("**/measurements/new", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue(),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/The server did not answer/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Weight (kg)")).toHaveValue("71.2");

  await page.unroute("**/measurements/new");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Measurement added.")).toBeVisible();
});

test("values typed before a reload are offered back, never applied unasked", async ({
  page,
}) => {
  await openNewForm(page);
  await page.getByLabel("Weight (kg)").fill("72.5");
  await page.getByLabel("Note").fill("before the reload");
  await page.reload();
  await settle(page);

  await expect(page.getByLabel("Weight (kg)")).toHaveValue("");
  await expect(page.getByText(/were not saved/)).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByLabel("Weight (kg)")).toHaveValue("72.5");
  await expect(page.getByLabel("Note")).toHaveValue("before the reload");

  // Saved, the draft is gone.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Measurement added.")).toBeVisible();
  await openNewForm(page);
  await expect(page.getByText(/were not saved/)).toHaveCount(0);
});

test("a measurement can be edited and deleted", async ({ page }) => {
  await openNewForm(page);
  await page.getByLabel("Weight (kg)").fill("80");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Measurement added.")).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).click();
  await settle(page);
  await page.getByLabel("Weight (kg)").fill("79.5");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Measurement saved.")).toBeVisible();
  await expect(page.getByText("79.50 kg")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/measurements$/);
  await expect(page.getByText("No measurements yet.")).toBeVisible();
});
