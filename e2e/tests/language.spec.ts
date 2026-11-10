import { expect, test } from "@playwright/test";
import { newSignedInUser, saveProfile, settle } from "./helpers";

test("the chosen language survives signing out", async ({ page }) => {
  await newSignedInUser(page, "language");
  await saveProfile(page, { language: "Português" });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Painel", level: 1 })).toBeVisible();

  await settle(page);
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.waitForURL(/\/login/);
  // The browser asks for English (en-GB); the reader chose Portuguese.
  await expect(page.getByRole("button", { name: "Iniciar sessão", exact: true })).toBeVisible();
});
