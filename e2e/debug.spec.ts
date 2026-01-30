import { test, expect } from "@playwright/test";

// Skip setup dependency for this test
test.use({ storageState: { cookies: [], origins: [] } });

test("debug endpoint after login", async ({ page }) => {
  // Login first
  await page.goto("/sign-in");
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });

  // Enter username
  await page.fill('input[name="identifier"]', "testcustomer1");
  await page.click('button:has-text("Continue")');

  // Wait for password and enter it
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.locator('input[type="password"]').fill("ComplianceTest2026!");
  await page.click('button:has-text("Continue")');

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 20000 });

  // Take a screenshot of the current page (dashboard)
  await page.screenshot({ path: "test-results/dashboard-state.png" });

  // Now hit the debug endpoint
  const response = await page.goto("/api/debug");
  const content = await page.content();

  console.log("=== DEBUG RESPONSE ===");
  console.log(content);
  console.log("======================");

  // Extract JSON from the page
  const bodyText = await page.locator("body").innerText();
  console.log("Body text:", bodyText);
});
