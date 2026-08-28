import { expect, test, type Page } from "@playwright/test";

async function boot(page: Page, path = "/") {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(path);
  await page.locator(".boot-wrap").waitFor({ state: "detached", timeout: 15_000 });
  await expect(page.locator(".lc-root")).toBeVisible();
  expect(pageErrors).toEqual([]);
}

test("desktop shell boots with the About window and dock", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page);

  await expect(page.locator(".dock")).toBeVisible();
  await expect(page.locator(".win").first()).toBeVisible();
  await expect(page.locator(".about-app")).toBeVisible();
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile shell boots and can open the public Ask boundary", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, "/?app=ask");

  await expect(page.locator(".mobile-root")).toBeVisible();
  await expect(page.getByText("The private model, retrieval, tracing, and query-log implementation is intentionally not included in this clean challenge repository.")).toBeVisible();

  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

for (const path of ["/about", "/projects", "/resume"] as const) {
  test(`${path} remains a crawlable document route`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main")).toBeVisible();
  });
}
