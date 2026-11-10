import { expect, test } from "@playwright/test";
import {
  historyCsv,
  importCsv,
  newSignedInUser,
  saveProfile,
  settle,
} from "./helpers";

test("one account can neither see nor reach another's measurements", async ({
  browser,
}) => {
  const alice = await (await browser.newContext()).newPage();
  await newSignedInUser(alice, "alice");
  await saveProfile(alice);
  await importCsv(alice, historyCsv(3));
  await alice.goto("/measurements");
  await settle(alice);
  const href = await alice
    .locator('a[href^="/measurements/"]:not([href$="/new"])')
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/measurements\/[0-9a-f-]{36}$/);

  const bob = await (await browser.newContext()).newPage();
  await newSignedInUser(bob, "bob");
  await saveProfile(bob);

  await bob.goto(href as string);
  await expect(bob.getByText("Page not found.")).toBeVisible();
  await bob.goto(`${href}/edit`);
  await expect(bob.getByText("Page not found.")).toBeVisible();

  const csv = await (await bob.request.get("/api/export?format=csv")).text();
  expect(csv.trim().split(/\r?\n/)).toHaveLength(1);

  await bob.goto("/measurements");
  await expect(bob.getByText("No measurements yet.")).toBeVisible();
});
