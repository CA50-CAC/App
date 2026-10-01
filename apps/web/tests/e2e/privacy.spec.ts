/**
 * Visibility in a real browser, on the seeded demo school:
 * Full items have photos, Limited items have none (and no note in the page at
 * all), Staff-only items aren't listed, and flipping "Private" hides an item.
 */
import { expect, test } from "@playwright/test";
import { DEMO_SLUG, DEMO_STAFF, joinDemo, signIn } from "./helpers";

test("students see Full with photos, Limited without, and no Staff-only items", async ({ page }) => {
  await joinDemo(page);
  await expect(page.getByText("21 items")).toBeVisible();
  // Staff-only demo items: a Chromebook, a wallet, a bracelet.
  const html = await page.content();
  for (const hidden of ["Chromebook", "Leather wallet", "heart charm", "Asset tag", "office safe"]) expect(html).not.toContain(hidden);

  // A Full item has a real photo.
  await page.goto(`/s/${DEMO_SLUG}?q=dent+lid`);
  await page.getByRole("link", { name: /Water bottle/ }).first().click();
  const img = page.getByRole("img", { name: /black water bottle/i });
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

  // A Limited item: no photo, no note, anywhere in the page, and no private notes.
  await page.goto(`/s/${DEMO_SLUG}?category=electronics`);
  await page.getByRole("link", { name: /Phone, tablet, or laptop/ }).first().click();
  await expect(page.getByText("This item has no photo to protect the owner.")).toBeVisible();
  const detail = await page.content();
  expect(detail).not.toContain("clear case with stickers");
  expect(detail).not.toContain("golden retriever");
  expect(detail).not.toContain("/api/photos/");
});

test("flipping 'Private' on a Full item removes it from the student view right away", async ({ browser }) => {
  const staffCtx = await browser.newContext();
  const staff = await staffCtx.newPage();
  await signIn(staff, DEMO_STAFF);
  await staff.goto("/admin?category=sports_gear");
  await staff.getByRole("link", { name: /Sports gear/ }).click();
  await staff.waitForURL(/\/admin\/items\/[0-9a-f-]{36}$/);
  const itemUrl = staff.url();
  const itemId = itemUrl.split("/").pop()!;

  const studentCtx = await browser.newContext();
  const student = await studentCtx.newPage();
  await joinDemo(student);
  await student.goto(`/s/${DEMO_SLUG}/items/${itemId}`);
  await expect(student.getByRole("img", { name: /orange sports gear/i })).toBeVisible();

  await staff.getByRole("button", { name: /Make private/ }).click();
  await expect(staff.getByText("Students can't see this item.")).toBeVisible();

  await student.reload();
  await expect(student.getByText("This item isn't available anymore.")).toBeVisible();
  await student.goto(`/s/${DEMO_SLUG}?category=sports_gear`);
  await expect(student.getByText("Nothing found yet")).toBeVisible();

  await staff.getByRole("button", { name: "Show to students again" }).click();
  await staffCtx.close();
  await studentCtx.close();
});

test("student pages and staff pages are not indexable", async ({ page }) => {
  await joinDemo(page);
  const res = await page.goto(`/s/${DEMO_SLUG}`);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("a student who hasn't joined can't open a school's gallery by URL", async ({ page }) => {
  await page.goto(`/s/${DEMO_SLUG}`);
  await expect(page).toHaveURL(/\/\?join=1$/);
});
