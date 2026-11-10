import { expect, test } from "@playwright/test";
import { PASSWORD, emailedLinks, settle, signIn, uniqueEmail } from "./helpers";

test("signing up needs the emailed confirmation before a session exists", async ({
  page,
}) => {
  const email = uniqueEmail("signup");
  await page.goto("/register");
  await settle(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Almost there/)).toBeVisible();

  // Before confirming, signing in is refused with a way to resend.
  await page.goto("/login");
  await settle(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/Confirm your email address first/)).toBeVisible();

  const [link] = await emailedLinks(page.request, email);
  expect(link).toBeTruthy();
  await page.request.get(link as string);

  await signIn(page, email);
  // A new account has no profile yet, and is told what to do first.
  await expect(page.getByText("Add your height first")).toBeVisible();
});

test("pages with data need a session", async ({ page }) => {
  for (const path of ["/", "/measurements", "/profile", "/metrics/weightKg"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});
