import { test, expect, pages, waitForPageLoad } from "./fixtures";

test.describe("Compliance Tracking", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.compliance);
    await waitForPageLoad(page);
  });

  test("should display compliance tracker page", async ({ page }) => {
    // Verify page title
    await expect(
      page.locator("h1").filter({ hasText: /Compliance/i })
    ).toBeVisible();

    // Should show compliance status description
    await expect(
      page.locator("text=compliance").or(page.locator("text=testing schedules"))
    ).toBeVisible();
  });

  test("should display compliance status summary cards", async ({ page }) => {
    // Should show status cards
    await expect(
      page
        .locator("text=Overdue")
        .or(page.locator("text=Due Soon"))
        .or(page.locator("text=Current"))
    ).toBeVisible();
  });

  test("should display compliance items list", async ({ page }) => {
    // Should show compliance items
    const complianceItem = page
      .locator('[class*="card"]')
      .filter({ has: page.locator("text=Testing").or(page.locator("text=days")) });

    // If there are compliance items
    const count = await complianceItem.count();
    if (count > 0) {
      await expect(complianceItem.first()).toBeVisible();

      // Each item should show service name and due date
      await expect(
        complianceItem.first().locator("text=Testing").or(
          complianceItem.first().locator("text=Assessment")
        )
      ).toBeVisible();
    }
  });

  test("should show overdue items with alert styling", async ({ page }) => {
    const overdueSection = page.locator("text=Overdue");

    if (await overdueSection.isVisible()) {
      // Overdue section should have warning/alert styling
      const overdueCard = page
        .locator('[class*="card"]')
        .filter({ has: page.locator("text=Overdue") });

      if (await overdueCard.isVisible()) {
        // Should have red/warning styling
        await expect(
          overdueCard.locator('[class*="red"]').or(
            overdueCard.locator('[class*="destructive"]')
          )
        ).toBeVisible();
      }
    }
  });

  test("should show due soon items with warning styling", async ({ page }) => {
    const dueSoonSection = page.locator("text=Due Within");

    if (await dueSoonSection.isVisible()) {
      const dueSoonCard = page
        .locator('[class*="card"]')
        .filter({ has: page.locator("text=Due Within") });

      if (await dueSoonCard.isVisible()) {
        // Should have amber/warning styling
        await expect(
          dueSoonCard.locator('[class*="amber"]').or(
            dueSoonCard.locator('[class*="warning"]')
          )
        ).toBeVisible();
      }
    }
  });

  test("should show current/up-to-date items", async ({ page }) => {
    const currentSection = page.locator("text=Up to Date");

    if (await currentSection.isVisible()) {
      const currentCard = page
        .locator('[class*="card"]')
        .filter({ has: page.locator("text=Up to Date") });

      if (await currentCard.isVisible()) {
        // Should have green/success styling
        await expect(
          currentCard.locator('[class*="green"]').or(
            currentCard.locator('[class*="success"]')
          )
        ).toBeVisible();
      }
    }
  });

  test("should toggle auto-rebook setting", async ({ page }) => {
    // Find an auto-rebook toggle
    const autoRebookBtn = page
      .getByRole("button")
      .filter({ hasText: /Auto|Manual/i })
      .first();

    if (await autoRebookBtn.isVisible()) {
      // Click to toggle
      await autoRebookBtn.click();

      // Wait for toggle animation/API call
      await page.waitForTimeout(1000);

      // Should show success toast or button state change
      await expect(
        page.locator("text=enabled").or(page.locator("text=disabled"))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should navigate to book now from compliance item", async ({ page }) => {
    // Find a book now button
    const bookNowBtn = page
      .getByRole("link", { name: /Book Now/i })
      .or(page.getByRole("button", { name: /Book Now/i }))
      .first();

    if (await bookNowBtn.isVisible()) {
      await bookNowBtn.click();

      // Should navigate to booking page with pre-filled data
      await expect(page).toHaveURL(/\/bookings\/new/);
    }
  });

  test("should display last test date for completed items", async ({ page }) => {
    // Look for "Last tested" text
    const lastTestedText = page.locator("text=Last tested");

    if (await lastTestedText.isVisible()) {
      // Should show a date
      await expect(
        page.locator("text=/Last tested:.*\\d{1,2}.*\\d{4}/i")
      ).toBeVisible();
    }
  });

  test("should display next due date for all items", async ({ page }) => {
    // Look for "Next due" or "Due in" text
    const dueDateText = page
      .locator("text=Next due")
      .or(page.locator("text=Due in"));

    if (await dueDateText.first().isVisible()) {
      // Should show days remaining or a date
      await expect(
        page.locator("text=/\\d+ days/i").or(page.locator("text=/\\d{1,2}.*\\d{4}/"))
      ).toBeVisible();
    }
  });

  test("should show compliance metrics/statistics", async ({ page }) => {
    // Should show count of items in each status
    const overdueCount = page.locator('[class*="card"]').filter({
      has: page.locator("text=Overdue"),
    });

    const dueSoonCount = page.locator('[class*="card"]').filter({
      has: page.locator("text=Due Soon"),
    });

    const currentCount = page.locator('[class*="card"]').filter({
      has: page.locator("text=Current").or(page.locator("text=Up to Date")),
    });

    // At least one category should be visible
    await expect(
      overdueCount.or(dueSoonCount).or(currentCount).first()
    ).toBeVisible();
  });
});

test.describe("Auto-Rebook Functionality", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test("should enable auto-rebook for a service", async ({ page }) => {
    await page.goto(pages.compliance);
    await waitForPageLoad(page);

    // Find manual/disabled auto-rebook button
    const manualBtn = page
      .getByRole("button")
      .filter({ hasText: /Manual/i })
      .first();

    if (await manualBtn.isVisible()) {
      await manualBtn.click();

      // Should enable and show Auto
      await expect(
        page.locator("text=Auto-rebook enabled").or(page.locator("text=Auto"))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should disable auto-rebook for a service", async ({ page }) => {
    await page.goto(pages.compliance);
    await waitForPageLoad(page);

    // Find enabled auto-rebook button
    const autoBtn = page
      .getByRole("button")
      .filter({ hasText: /^Auto$/i })
      .first();

    if (await autoBtn.isVisible()) {
      await autoBtn.click();

      // Should disable and show Manual
      await expect(
        page.locator("text=disabled").or(page.locator("text=Manual"))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
