/**
 * The MVP loop, end to end: staff post an item with a photo, a student joins
 * on a phone, finds it, claims it, staff approve it and mark it returned.
 */
import path from "node:path";
import { expect, test } from "@playwright/test";
import { DEMO_SLUG, DEMO_STAFF, joinDemo, signIn } from "./helpers";

test("staff post → student claims → staff approve → returned", async ({ browser }) => {
  const staffCtx = await browser.newContext();
  const staff = await staffCtx.newPage();
  await signIn(staff, DEMO_STAFF);

  // 1. Staff post a found item with a photo.
  await staff.goto("/admin/items/new");
  await staff.setInputFiles('input[name="photo"]', path.join(__dirname, "fixtures", "photo-with-gps.jpg"));
  await staff.getByLabel("Category", { exact: true }).selectOption("bag");
  await staff.getByText("Purple", { exact: true }).click();
  await staff.locator("#foundLocationId").selectOption({ label: "Library" });
  await staff.locator("#note").fill("Purple tote bag with a moon patch");
  await staff.locator("#staffNote").fill("Inside pocket has a library card for M. Chen");
  await staff.getByRole("button", { name: "Add item" }).click();
  await expect(staff.getByText("Item added. Students can see it now.")).toBeVisible();
  const itemUrl = staff.url();

  // 2. A student joins on a phone and finds it.
  const studentCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const student = await studentCtx.newPage();
  await joinDemo(student);
  await student.getByRole("searchbox").fill("purple moon");
  await student.getByRole("button", { name: "Search", exact: true }).click();
  await expect(student.getByText("1 item")).toBeVisible();
  await student.getByRole("link", { name: /Bag or backpack/ }).click();
  const photo = student.getByRole("img", { name: /purple bag or backpack, found at Library/ });
  await expect(photo).toBeVisible();
  // The fixture photo carries GPS and a planted EXIF tag; what students download must not.
  const served = await student.request.get((await photo.getAttribute("src"))!);
  expect(served.headers()["content-type"]).toBe("image/jpeg");
  const bytes = (await served.body()).toString("latin1");
  expect(bytes).not.toContain("E2E-SECRET");
  expect(bytes).not.toContain("TestCam");
  await expect(student.getByText("library card")).toHaveCount(0);

  // 3. The student claims it and gets a code.
  await student.getByLabel("Identifying detail").fill("There's a library card in the inside pocket");
  await student.getByRole("button", { name: "Send claim" }).click();
  await expect(student.getByText("Claim sent")).toBeVisible();
  const code = (await student.locator(".select-all").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);

  // 4. Staff see it in the queue beside the private notes, and approve.
  await staff.goto("/admin/claims");
  const card = staff.getByRole("article").filter({ hasText: "library card in the inside pocket" });
  await expect(card.getByText("Inside pocket has a library card for M. Chen")).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(staff.getByText("Saved.")).toBeVisible();

  // 5. The student checks the status with the code.
  await student.goto(`/s/${DEMO_SLUG}/status?code=${code}`);
  await expect(student.getByText("Approved: ready for pickup")).toBeVisible();

  // 6. Staff mark it picked up; the item is returned and off the gallery.
  await staff.goto("/admin/claims?view=approved");
  await staff
    .getByRole("article")
    .filter({ hasText: "library card in the inside pocket" })
    .getByRole("button", { name: "Mark picked up and returned" })
    .click();
  await staff.goto(itemUrl);
  await expect(staff.getByText("Returned", { exact: true }).first()).toBeVisible();

  await student.goto(`/s/${DEMO_SLUG}/status?code=${code}`);
  await expect(student.getByText("Picked up", { exact: true })).toBeVisible();
  await student.goto(`/s/${DEMO_SLUG}?q=purple+moon`);
  await expect(student.getByText("Nothing found yet")).toBeVisible();

  await staffCtx.close();
  await studentCtx.close();
});
