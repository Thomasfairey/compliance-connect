import { test, expect, pages, waitForPageLoad } from "./fixtures";

test.describe("Customer Booking Flow", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.dashboard);
    await waitForPageLoad(page);
  });

  test("should display customer dashboard with stats", async ({ page }) => {
    // Verify dashboard elements
    await expect(page.locator("text=Welcome")).toBeVisible();
    await expect(page.locator("text=Total Bookings")).toBeVisible();
    await expect(page.locator("text=Pending")).toBeVisible();
    await expect(page.locator("text=Completed")).toBeVisible();
    await expect(page.locator("text=Sites")).toBeVisible();
  });

  test("should navigate to new booking page", async ({ page }) => {
    // Click new booking button
    await page.click("text=New Booking");

    // Should be on booking wizard
    await expect(page).toHaveURL(/\/bookings\/new/);
    await expect(page.locator("text=Select a Site")).toBeVisible();
  });

  test("should create a new booking - full flow", async ({ page }) => {
    // Go to new booking
    await page.goto(pages.newBooking);
    await waitForPageLoad(page);

    // Step 1: Select a site
    await expect(page.locator("text=Select a Site")).toBeVisible();

    // Click on first available site
    const siteCard = page.locator('[data-testid="site-card"]').first();
    if (await siteCard.isVisible()) {
      await siteCard.click();
    } else {
      // If no site cards, try selecting from dropdown
      await page.getByRole("combobox").first().click();
      await page.getByRole("option").first().click();
    }

    // Click continue/next
    await page.getByRole("button", { name: /continue|next/i }).click();

    // Step 2: Select a service
    await expect(
      page.locator("text=Select a Service").or(page.locator("text=Choose a service"))
    ).toBeVisible({ timeout: 5000 });

    // Select PAT Testing (or first service)
    const serviceCard = page
      .locator('[data-testid="service-card"]')
      .filter({ hasText: /PAT Testing/i })
      .first();

    if (await serviceCard.isVisible()) {
      await serviceCard.click();
    } else {
      // Click first service option
      await page.locator('[data-testid="service-card"]').first().click();
    }

    await page.getByRole("button", { name: /continue|next/i }).click();

    // Step 3: Enter quantity
    await expect(
      page.locator("text=How many").or(page.locator("text=Quantity"))
    ).toBeVisible({ timeout: 5000 });

    // Fill quantity
    await page.getByLabel(/quantity|items|how many/i).fill("50");

    await page.getByRole("button", { name: /continue|next/i }).click();

    // Step 4: Select date
    await expect(
      page.locator("text=Select a Date").or(page.locator("text=Choose a date"))
    ).toBeVisible({ timeout: 5000 });

    // Click on a future date in the calendar
    const futureDate = page
      .locator("button")
      .filter({ hasText: /^\d{1,2}$/ })
      .filter({ hasNot: page.locator(".text-muted-foreground") })
      .first();

    await futureDate.click();

    await page.getByRole("button", { name: /continue|next/i }).click();

    // Step 5: Select time slot
    await expect(
      page.locator("text=Select a Time").or(page.locator("text=Time Slot"))
    ).toBeVisible({ timeout: 5000 });

    // Click morning slot
    await page.locator("button").filter({ hasText: /9:00|10:00|AM/ }).first().click();

    await page.getByRole("button", { name: /continue|next/i }).click();

    // Step 6: Review and confirm
    await expect(
      page.locator("text=Review").or(page.locator("text=Confirm"))
    ).toBeVisible({ timeout: 5000 });

    // Submit booking
    await page.getByRole("button", { name: /confirm|book|submit/i }).click();

    // Should redirect to booking confirmation or bookings list
    await Promise.race([
      expect(page.locator("text=Booking Confirmed")).toBeVisible({ timeout: 10000 }),
      expect(page.locator("text=successfully")).toBeVisible({ timeout: 10000 }),
      expect(page).toHaveURL(/\/bookings/, { timeout: 10000 }),
    ]);
  });

  test("should view booking list", async ({ page }) => {
    await page.goto(pages.bookings);
    await waitForPageLoad(page);

    // Should see bookings page
    await expect(
      page.locator("h1").filter({ hasText: /Bookings/i })
    ).toBeVisible();

    // Should have filter/tab options
    await expect(
      page.locator("text=All").or(page.locator("text=Pending"))
    ).toBeVisible();
  });

  test("should view booking details", async ({ page }) => {
    await page.goto(pages.bookings);
    await waitForPageLoad(page);

    // Click on first booking
    const bookingLink = page.locator("a[href*='/bookings/']").first();

    if (await bookingLink.isVisible()) {
      await bookingLink.click();

      // Should be on booking detail page
      await expect(page).toHaveURL(/\/bookings\/[a-z0-9]+/i);

      // Should show booking details
      await expect(
        page.locator("text=Booking Details").or(page.locator("text=Status"))
      ).toBeVisible();
    }
  });

  test("should cancel a pending booking", async ({ page }) => {
    await page.goto(pages.bookings);
    await waitForPageLoad(page);

    // Find a pending booking
    const pendingBooking = page
      .locator("a[href*='/bookings/']")
      .filter({ has: page.locator("text=Pending") })
      .first();

    if (await pendingBooking.isVisible()) {
      await pendingBooking.click();

      // Look for cancel button
      const cancelBtn = page.getByRole("button", { name: /cancel/i });

      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();

        // Confirm cancellation in dialog
        await page.getByRole("button", { name: /confirm|yes/i }).click();

        // Should show cancelled status or success message
        await expect(
          page
            .locator("text=Cancelled")
            .or(page.locator("text=cancelled successfully"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Customer Navigation", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test("should navigate between main pages", async ({ page }) => {
    await page.goto(pages.dashboard);

    // Navigate to bookings
    await page.click("text=Bookings");
    await expect(page).toHaveURL(/\/bookings/);

    // Navigate to bundles
    await page.click("text=Bundles");
    await expect(page).toHaveURL(/\/bookings\/bundles/);

    // Navigate to compliance
    await page.click("text=Compliance");
    await expect(page).toHaveURL(/\/compliance/);

    // Navigate to sites
    await page.click("text=Sites");
    await expect(page).toHaveURL(/\/sites/);

    // Back to dashboard
    await page.click("text=Dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
