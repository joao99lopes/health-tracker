import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Shared steps. Accounts live only in the Auth emulator and the throwaway
 * database scripts/e2e.sh starts, so the password below is a test value and
 * nothing else.
 */

export const PASSWORD = "e2e-only-password";

const EMULATOR = process.env.E2E_EMULATOR_URL ?? "http://localhost:9099";
const PROJECT = "demo-health";
const IDENTITY = `${EMULATOR}/identitytoolkit.googleapis.com/v1`;

let counter = 0;

/** An address no other test (or earlier run against the same emulator) uses. */
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.test`;
}

/** A Firebase account with its address already confirmed. */
export async function createVerifiedAccount(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const signUp = await request.post(`${IDENTITY}/accounts:signUp?key=fake-api-key`, {
    data: { email, password: PASSWORD, returnSecureToken: true },
  });
  expect(signUp.ok()).toBeTruthy();
  const { localId } = (await signUp.json()) as { localId: string };
  const verify = await request.post(`${IDENTITY}/projects/${PROJECT}/accounts:update`, {
    headers: { Authorization: "Bearer owner" },
    data: { localId, emailVerified: true },
  });
  expect(verify.ok()).toBeTruthy();
}

/** The out-of-band links the emulator "sent" to an address, newest last. */
export async function emailedLinks(
  request: APIRequestContext,
  email: string,
): Promise<string[]> {
  const response = await request.get(
    `${EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`,
  );
  const { oobCodes } = (await response.json()) as {
    oobCodes: Array<{ email: string; oobLink: string }>;
  };
  return oobCodes.filter((code) => code.email === email).map((code) => code.oobLink);
}

/**
 * Waits until the page has hydrated: text typed into a server-rendered input
 * before React takes over is lost (see docs/HANDOFF.md).
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await settle(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("/");
}

/** A new verified account, signed in. */
export async function newSignedInUser(page: Page, prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  await createVerifiedAccount(page.request, email);
  await signIn(page, email);
  return email;
}

export async function saveProfile(
  page: Page,
  { heightCm = "170", language }: { heightCm?: string; language?: "Português" } = {},
): Promise<void> {
  await page.goto("/profile");
  await settle(page);
  await page.getByLabel("Date of birth").fill("1990-04-12");
  await page.getByRole("combobox", { name: "Sex" }).click();
  await page.getByRole("option", { name: "Female" }).click();
  await page.getByLabel("Height (cm)").fill(heightCm);
  if (language) {
    await page.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: language }).click();
  }
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(language ? "Perfil guardado." : "Profile saved.")).toBeVisible();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A history in the export format: one reading every `everyDays` days back
 * from yesterday, weight drifting down, every third one with body fat and
 * every fifth with a waist.
 */
export function historyCsv(count: number, everyDays = 3): string {
  const header =
    "measuredAt,weightKg,bodyFatPercent,hydrationPercent,musclePercent,boneMassKg,visceralFat,abdominalCircumferenceCm,heightCmAtMeasurement,note";
  const start = Date.now() - DAY_MS;
  const rows = Array.from({ length: count }, (_, index) => {
    const at = new Date(start - index * everyDays * DAY_MS).toISOString();
    const weight = (70 + index * 0.1).toFixed(2);
    const fat = index % 3 === 0 ? (30 + index * 0.05).toFixed(1) : "";
    const waist = index % 5 === 0 ? (82 + index * 0.1).toFixed(1) : "";
    const note = index === 0 ? "After breakfast" : "";
    return `${at},${weight},${fat},,,,,${waist},170,${note}`;
  });
  return [header, ...rows].join("\r\n") + "\r\n";
}

/** Imports `csv` through the profile page, as a person would. */
export async function importCsv(page: Page, csv: string): Promise<void> {
  await page.goto("/profile");
  await settle(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/^\d+ measurements? imported/)).toBeVisible();
}
