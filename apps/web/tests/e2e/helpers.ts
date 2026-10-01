import { expect, type Page } from "@playwright/test";

export const DEMO_STAFF = "demo@lostbox.test";
export const DEMO_CODE = "DEMO2026";
export const DEMO_SLUG = "demo-high-school";

/** Signs in with a magic link. In demo mode the link is shown on the page instead of emailed. */
export async function signIn(page: Page, email: string, next = "/admin") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("School email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const link = page.getByRole("link", { name: "Open sign-in link" });
  await expect(link).toBeVisible();
  await page.goto((await link.getAttribute("href"))!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth") && !u.pathname.startsWith("/login"));
}

export async function joinDemo(page: Page) {
  await page.goto("/");
  await page.getByLabel("Join code").fill(DEMO_CODE.toLowerCase());
  await page.getByRole("button", { name: "Find my school" }).click();
  await page.waitForURL(`**/s/${DEMO_SLUG}`);
}
