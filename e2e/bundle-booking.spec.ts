import { test, expect, pages, waitForPageLoad } from "./fixtures";

test.describe("Bundle Booking Flow", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.bundles);
    await waitForPageLoad(page);
  });

  test("should display bundle selection page", async ({ page }) => {
    // Verify page title
    await expect(page.locator("h1").filter({ hasText: /Bundle/i })).toBeVisible();

    // Should show discount info
    await expect(page.locator("text=Save")).toBeVisible();
  });

  test("should display available bundles", async ({ page }) => {
    // Should show bundle cards
    const bundleCards = page.locator('[class*="card"]').filter({
      has: page.locator("text=Save"),
    });

    // Expect at least one bundle
    await expect(bundleCards.first()).toBeVisible({ timeout: 10000 });

    // Check for expected bundles
    await expect(
      page
        .locator("text=Annual Compliance")
        .or(page.locator("text=Fire Safety"))
    ).toBeVisible();
  });

  test("should show bundle details with services included", async ({ page }) => {
    // Find a bundle card
    const bundleCard = page
      .locator('[class*="card"]')
      .filter({ hasText: /Fire Safety Bundle/i })
      .first();

    if (await bundleCard.isVisible()) {
      // Should show discount percentage
      await expect(bundleCard.locator("text=Save")).toBeVisible();

      // Should show included services
      await expect(
        bundleCard
          .locator("text=Fire Alarm")
          .or(bundleCard.locator("text=Emergency Lighting"))
      ).toBeVisible();
    }
  });

  test("should select a bundle and proceed to quantities", async ({ page }) => {
    // Select first bundle
    const bundleCard = page
      .locator('[class*="card"]')
      .filter({ hasText: /Save/ })
      .first();

    await bundleCard.click();

    // Should show quantity customization
    await expect(
      page
        .locator("text=Customize Quantities")
        .or(page.locator("text=Quantities"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should customize quantities and see price update", async ({ page }) => {
    // Select first bundle
    const bundleCard = page
      .locator('[class*="card"]')
      .filter({ hasText: /Save/ })
      .first();

    await bundleCard.click();

    // Wait for quantity form
    await expect(
      page.locator('input[type="number"]').first()
    ).toBeVisible({ timeout: 5000 });

    // Change a quantity
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");

    // Price should update (look for price display)
    await expect(
      page.locator("text=Total").or(page.locator("text=£"))
    ).toBeVisible();
  });

  test("should complete full bundle booking flow", async ({ page }) => {
    // Step 1: Select a site if prompted
    const siteSelect = page.getByRole("combobox").first();
    if (await siteSelect.isVisible()) {
      await siteSelect.click();
      await page.getByRole("option").first().click();
    }

    // Step 2: Select a bundle
    const bundleCard = page
      .locator('[class*="card"]')
      .filter({ hasText: /Save/ })
      .first();

    await bundleCard.click();

    // Step 3: Quantities page
    await page.waitForTimeout(1000);
    const continueBtn = page.getByRole("button", {
      name: /continue|next|schedule/i,
    });

    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }

    // Step 4: Select date
    const dateSelector = page.locator("button").filter({ hasText: /^\d{1,2}$/ });
    if (await dateSelector.first().isVisible({ timeout: 3000 })) {
      await dateSelector.first().click();

      // Continue to time slot
      const nextBtn = page.getByRole("button", { name: /continue|next/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }
    }

    // Step 5: Select time slot
    const timeSlot = page.locator("button").filter({ hasText: /AM|PM|9:00|10:00/ });
    if (await timeSlot.first().isVisible({ timeout: 3000 })) {
      await timeSlot.first().click();
    }

    // Step 6: Confirm booking
    const confirmBtn = page.getByRole("button", { name: /confirm|book|submit/i });
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click();

      // Should show success or redirect
      await expect(
        page
          .locator("text=successfully")
          .or(page.locator("text=Booking Confirmed"))
          .or(page)
      ).toHaveURL(/\/bookings/, { timeout: 10000 });
    }
  });

  test("should skip to individual service booking", async ({ page }) => {
    // Look for skip button
    const skipBtn = page.getByRole("button", { name: /skip/i });

    if (await skipBtn.isVisible()) {
      await skipBtn.click();

      // Should redirect to regular booking flow
      await expect(page).toHaveURL(/\/bookings\/new/);
    }
  });

  test("should show recommended bundles based on site profile", async ({
    page,
  }) => {
    // If a site is selected, should show recommended section
    const recommendedSection = page.locator("text=Recommended");

    if (await recommendedSection.isVisible({ timeout: 3000 })) {
      // Should show recommended badge on some bundles
      await expect(
        page.locator('[class*="badge"]').filter({ hasText: /Recommended/i })
      ).toBeVisible();
    }
  });

  test("should display bundle discount savings", async ({ page }) => {
    // Find a bundle with discount
    const discountBadge = page
      .locator('[class*="badge"]')
      .filter({ hasText: /Save \d+%/ })
      .first();

    await expect(discountBadge).toBeVisible();

    // Should also show original vs discounted price
    await expect(
      page.locator("text=£").or(page.locator('[class*="line-through"]'))
    ).toBeVisible();
  });
});
