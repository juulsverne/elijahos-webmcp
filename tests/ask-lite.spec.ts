import { expect, test, type Page } from "@playwright/test";

async function boot(page: Page, path = "/?app=ask") {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(path);
  await page.locator(".boot-wrap").waitFor({ state: "detached", timeout: 15_000 });
  await expect(page.locator(".lc-root")).toBeVisible();
  expect(pageErrors).toEqual([]);
}

function event(type: string, fields: Record<string, unknown> = {}): string {
  return `data: ${JSON.stringify({ type, ...fields })}\n\n`;
}

async function mockAnswer(page: Page) {
  await page.route("**/api/ask/stream", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(requestBody.messages.at(-1)).toEqual({
      role: "user",
      content: "What makes Elijah useful on an AI team?",
    });

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body:
        event("sources", {
          sources: [
            {
              id: "profile:summary",
              kind: "profile",
              title: "Profile summary",
              claim: "Elijah is an AI Transformation Engineer.",
              canonicalPath: "/about",
              sourceLabel: "src/lib/elijah.ts — profile",
              contributionScope: "Candidate-authored profile.",
              provenance: {
                type: "candidate-authored",
                label: "Published profile",
                updated: "2026-09-03",
              },
              limitations: ["Candidate-authored; not independently verified."],
              matchedTerms: ["ai", "team"],
            },
          ],
          unmatchedTerms: [],
        }) +
        event("token", {
          content: "Elijah connects operating judgment with hands-on AI delivery [1].",
        }) +
        event("done"),
    });
  });
}

test("desktop Ask Elijah answers a suggestion and renders its public source", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockAnswer(page);
  await boot(page);

  await expect(page.locator(".ask-app")).toBeVisible();
  await expect(page.getByText("Site-owned guide", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "What makes Elijah useful on an AI team?" })
    .click();

  await expect(page.locator('.ask-message[data-role="user"]')).toContainText(
    "What makes Elijah useful on an AI team?",
  );
  await expect(page.locator('.ask-message[data-role="assistant"]')).toContainText(
    "hands-on AI delivery",
  );
  const source = page.getByRole("link", { name: /Profile summary/ });
  await expect(source).toHaveAttribute("href", "/about");
  await expect(page.locator(".ask-source")).toContainText("candidate-authored");
});

test("mobile Ask Elijah keeps the composer visible and shows safe stream errors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/ask/stream", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body:
        event("sources", { sources: [], unmatchedTerms: [] }) +
        event("error", { message: "Ask Elijah is busy right now." }) +
        event("done"),
    }),
  );
  await boot(page);

  const composer = page.getByPlaceholder("ask Elijah about his public work");
  await expect(composer).toBeVisible();
  await composer.fill("What makes Elijah useful on an AI team?");
  await page.getByRole("button", { name: "send" }).click();
  await expect(page.locator(".ask-error")).toContainText(
    "Ask Elijah is busy right now.",
  );

  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});

