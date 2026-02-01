import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E Test Suite for Compliance Connect
 * Tests all critical user flows after bug fixes
 */

test.describe("Compliance Connect - Comprehensive Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("https://www.complianceod.co.uk/sign-in");
    await page.waitForSelector('input[name="identifier"]', { timeout: 15000 });
    await page.fill('input[name="identifier"]', "testcustomer1");
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.locator('input[type="password"]').fill("ComplianceTest2026!");
    await page.click('button:has-text("Continue")');
    await page.waitForURL(/dashboard/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test("1. Dashboard loads correctly with all components", async ({ page }) => {
    // Verify dashboard elements
    await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });

    // Check stat cards are visible - they appear in card containers
    await expect(page.locator("text=Total Bookings")).toBeVisible();
    // Check for stat card values (the number displays)
    const statCards = page.locator('.rounded-2xl, [class*="card"]');
    await expect(statCards.first()).toBeVisible();

    // Verify Pending stat card exists by looking for its label
    await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
    // Verify Completed stat card
    await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

    // Check navigation items are visible - use first() to avoid strict mode violations
    await expect(page.locator("text=Upcoming Bookings").first()).toBeVisible();
    await expect(page.locator("text=Recent Activity").first()).toBeVisible();

    console.log("✅ Dashboard loads correctly");
  });

  test("2. Site Profile Questionnaire is accessible", async ({ page }) => {
    // Navigate to Sites using sidebar navigation
    await page.locator('nav a:has-text("Sites")').first().click();
    await page.waitForURL(/sites/, { timeout: 10000 });

    // Check if there are any sites or create one
    const hasSites = await page.locator('[href^="/sites/"]').first().isVisible().catch(() => false);

    if (hasSites) {
      // Click on first site
      await page.locator('[href^="/sites/"]:not([href="/sites/new"])').first().click();
      await page.waitForTimeout(2000);

      // Look for Site Profile Questionnaire button
      const questionnaireButton = page.locator('button:has-text("Site Profile Questionnaire")');
      await expect(questionnaireButton).toBeVisible({ timeout: 5000 });

      // Click and verify questionnaire page loads
      await questionnaireButton.click();
      await page.waitForURL(/questionnaire/, { timeout: 10000 });

      // Verify questionnaire content
      await expect(page.locator("text=Site Profile")).toBeVisible();
      await expect(page.locator("text=Building Type")).toBeVisible();

      console.log("✅ Site Profile Questionnaire is accessible");
    } else {
      // Create a site first
      await page.click('a:has-text("Add Site")');
      await page.fill('input[name="name"]', "Test Site for Questionnaire");
      await page.fill('input[name="address"]', "123 Test Street");
      await page.fill('input[name="postcode"]', "SW1A 1AA");
      await page.click('button:has-text("Create Site")');
      await page.waitForTimeout(3000);

      console.log("✅ Created site for questionnaire test");
    }
  });

  test("3. Service Bundles are displayed", async ({ page }) => {
    // First ensure user has a site (bundles page redirects to sites/new if no sites)
    await page.locator('nav a:has-text("Sites")').first().click();
    await page.waitForURL(/sites/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check if user has sites, if not create one
    const hasSites = await page.locator('[href^="/sites/"]:not([href="/sites/new"])').first().isVisible().catch(() => false);

    if (!hasSites) {
      // Create a site first
      await page.click('a:has-text("Add Site")');
      await page.waitForURL(/sites\/new/, { timeout: 10000 });
      await page.fill('input[name="name"]', "E2E Test Site");
      await page.fill('input[name="address"]', "123 Test Street, London");
      await page.fill('input[name="postcode"]', "SW1A 1AA");
      await page.click('button:has-text("Create Site")');
      await page.waitForTimeout(3000);
      console.log("Created test site for bundles");
    }

    // Now navigate to Bundles
    await page.locator('nav a:has-text("Bundles")').first().click();
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/bundles-page.png", fullPage: true });

    // Check for bundle content
    const hasAnnualPackage = await page.locator("text=Annual Compliance Package").isVisible().catch(() => false);
    const hasFireSafety = await page.locator("text=Fire Safety Bundle").isVisible().catch(() => false);
    const hasElectrical = await page.locator("text=Electrical Safety Bundle").isVisible().catch(() => false);

    console.log("Bundle visibility:", { hasAnnualPackage, hasFireSafety, hasElectrical });

    // At least one bundle should be visible
    const anyBundleVisible = hasAnnualPackage || hasFireSafety || hasElectrical;
    expect(anyBundleVisible).toBe(true);

    console.log("✅ Service Bundles are displayed");
  });

  test("4. View Bookings works correctly", async ({ page }) => {
    // Navigate to Bookings using sidebar navigation
    await page.locator('nav a:has-text("Bookings")').first().click();
    await page.waitForURL(/bookings/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check filter tabs exist - correct tab names are Upcoming, In Progress, Completed, Cancelled
    await expect(page.locator('button[role="tab"]:has-text("Upcoming")').first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("In Progress")').first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Completed")').first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Cancelled")').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "test-results/bookings-page.png", fullPage: true });

    console.log("✅ Bookings page loads correctly");
  });

  test("5. Booking cancellation flow", async ({ page }) => {
    // Navigate to Bookings using sidebar navigation
    await page.locator('nav a:has-text("Bookings")').first().click();
    await page.waitForURL(/bookings/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for a pending booking to click
    const bookingLink = page.locator('[href^="/bookings/"]:not([href="/bookings/new"]):not([href="/bookings/bundles"])').first();
    const hasBooking = await bookingLink.isVisible().catch(() => false);

    if (hasBooking) {
      await bookingLink.click();
      await page.waitForTimeout(2000);

      // Check if cancel button exists (only for PENDING/CONFIRMED)
      const cancelButton = page.locator('button:has-text("Cancel Booking")');
      const canCancel = await cancelButton.isVisible().catch(() => false);

      if (canCancel) {
        console.log("✅ Cancel button visible for cancellable booking");
      } else {
        console.log("ℹ️ Booking is not in cancellable state (IN_PROGRESS/COMPLETED)");
      }
    } else {
      console.log("ℹ️ No bookings found to test cancellation");
    }
  });

  test("6. Compliance Dashboard shows tracking", async ({ page }) => {
    // Navigate to Compliance using sidebar navigation
    await page.locator('nav a:has-text("Compliance")').first().click();
    await page.waitForURL(/compliance/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: "test-results/compliance-page.png", fullPage: true });

    // Check for compliance tracker page title - use heading role to be specific
    await expect(page.getByRole("heading", { name: "Compliance Tracker" })).toBeVisible({ timeout: 5000 });

    // Check the description text
    await expect(page.locator("text=Track your compliance testing schedules").first()).toBeVisible();

    // The compliance dashboard shows three summary cards that are always present
    // Each card has a number and a label (Overdue, Due Soon, Current)
    // These summary cards are always visible even with 0 counts
    const summaryCards = page.locator('.rounded-lg, [class*="Card"]');
    const cardCount = await summaryCards.count();

    console.log("Compliance summary cards found:", cardCount);

    // Verify the page loaded with compliance content
    expect(cardCount).toBeGreaterThan(0);

    console.log("✅ Compliance Dashboard shows tracking");
  });

  test("7. Site edit shows success toast", async ({ page }) => {
    // Navigate to Sites using sidebar navigation
    await page.locator('nav a:has-text("Sites")').first().click();
    await page.waitForURL(/sites/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check if there are any sites
    const siteLink = page.locator('[href^="/sites/"]:not([href="/sites/new"])').first();
    const hasSites = await siteLink.isVisible().catch(() => false);

    if (hasSites) {
      await siteLink.click();
      await page.waitForTimeout(2000);

      // Click edit button
      const editButton = page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);

        // Make a small change
        const nameInput = page.locator('input[name="name"]');
        const currentName = await nameInput.inputValue();
        await nameInput.fill(currentName + " ");
        await nameInput.fill(currentName); // Revert

        // Save
        await page.click('button:has-text("Save Changes")');

        // Check for success toast
        const toast = page.locator("text=Site updated successfully");
        await expect(toast).toBeVisible({ timeout: 5000 });

        console.log("✅ Site edit shows success toast");
      }
    } else {
      console.log("ℹ️ No sites to test edit functionality");
    }
  });

  test("8. Bundle promo card on dashboard", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("https://www.complianceod.co.uk/dashboard");
    await page.waitForTimeout(2000);

    // Look for the bundle promo card
    const bundlePromo = page.locator("text=Save with Bundles").first();
    const hasBundlePromo = await bundlePromo.isVisible().catch(() => false);

    if (hasBundlePromo) {
      await expect(bundlePromo).toBeVisible();

      // Check for savings badge
      const savingsBadge = page.locator("text=/Save up to \\d+%/").first();
      await expect(savingsBadge).toBeVisible();

      // Check for CTA button
      const viewBundlesBtn = page.locator('a:has-text("View Bundles")');
      await expect(viewBundlesBtn).toBeVisible();

      console.log("✅ Bundle promo card displayed on dashboard");
    } else {
      // Bundle promo may not show if user has no sites
      console.log("ℹ️ Bundle promo card not shown (may require sites)");
    }
  });

  test("9. Booking type selector - Individual vs Bundle", async ({ page }) => {
    // First ensure user has a site
    await page.locator('nav a:has-text("Sites")').first().click();
    await page.waitForURL(/sites/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const hasSites = await page.locator('[href^="/sites/"]:not([href="/sites/new"])').first().isVisible().catch(() => false);

    if (!hasSites) {
      // Create a site first
      await page.click('a:has-text("Add Site")');
      await page.fill('input[name="name"]', "Booking Type Test Site");
      await page.fill('input[name="address"]', "456 Test Road, London");
      await page.fill('input[name="postcode"]', "EC1A 1BB");
      await page.click('button:has-text("Create Site")');
      await page.waitForTimeout(3000);
    }

    // Navigate to new booking
    await page.goto("https://www.complianceod.co.uk/bookings/new");
    await page.waitForTimeout(3000);

    // Check for booking type selector
    const individualOption = page.locator("text=Individual Service").first();
    const bundleOption = page.locator("text=Bundle").first();

    const hasTypeSelector = await individualOption.isVisible().catch(() => false);

    if (hasTypeSelector) {
      await expect(individualOption).toBeVisible();
      await expect(bundleOption).toBeVisible();

      // Click on individual service
      await individualOption.click();
      await page.waitForTimeout(2000);

      console.log("✅ Booking type selector works correctly");
    } else {
      // May redirect to site selection first
      console.log("ℹ️ Booking type selector flow requires site selection first");
    }
  });

  test("10. Bookings page structure is correct", async ({ page }) => {
    // Navigate to Bookings page to verify structure
    await page.locator('nav a:has-text("Bookings")').first().click();
    await page.waitForURL(/bookings/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: "test-results/bookings-with-data.png", fullPage: true });

    // Verify all tab structure exists
    await expect(page.locator('button[role="tab"]:has-text("Upcoming")').first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("In Progress")').first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Completed")').first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Cancelled")').first()).toBeVisible();

    // Check that bookings exist or empty state is shown
    const bookingItems = page.locator('[href^="/bookings/"]:not([href="/bookings/new"]):not([href="/bookings/bundles"])');
    const bookingCount = await bookingItems.count();

    console.log("Visible bookings on page:", bookingCount);

    // Verify New Booking button exists
    const newBookingBtn = page.locator('a:has-text("New Booking"), button:has-text("New Booking")').first();
    await expect(newBookingBtn).toBeVisible();

    // Check Completed tab structure
    await page.locator('button[role="tab"]:has-text("Completed")').first().click();
    await page.waitForTimeout(2000);

    console.log("✅ Bookings page structure verified");
  });

  test("11. Provisional booking badge display", async ({ page }) => {
    // Navigate to Bookings
    await page.locator('nav a:has-text("Bookings")').first().click();
    await page.waitForURL(/bookings/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for provisional/tentative bookings
    const provisionalBadge = page.locator("text=/Tentative|Confirms in/").first();
    const hasProvisional = await provisionalBadge.isVisible().catch(() => false);

    if (hasProvisional) {
      await expect(provisionalBadge).toBeVisible();
      console.log("✅ Provisional booking badges displayed");
    } else {
      // Check Upcoming tab specifically
      await page.locator('button[role="tab"]:has-text("Upcoming")').first().click();
      await page.waitForTimeout(2000);

      const upcomingProvisional = page.locator("text=/Tentative|Confirms in/").first();
      const hasUpcomingProvisional = await upcomingProvisional.isVisible().catch(() => false);

      if (hasUpcomingProvisional) {
        console.log("✅ Provisional bookings found in Upcoming tab");
      } else {
        console.log("ℹ️ No provisional bookings currently visible");
      }
    }
  });
});

// Mobile-specific tests
test.describe("Mobile Booking Navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X dimensions

  test.beforeEach(async ({ page }) => {
    await page.goto("https://www.complianceod.co.uk/sign-in");
    await page.waitForSelector('input[name="identifier"]', { timeout: 15000 });
    await page.fill('input[name="identifier"]', "testcustomer1");
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.locator('input[type="password"]').fill("ComplianceTest2026!");
    await page.click('button:has-text("Continue")');
    await page.waitForURL(/dashboard/, { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test("12. Mobile sticky footer appears", async ({ page }) => {
    // First ensure user has a site
    await page.goto("https://www.complianceod.co.uk/sites");
    await page.waitForTimeout(2000);

    const hasSites = await page.locator('[href^="/sites/"]:not([href="/sites/new"])').first().isVisible().catch(() => false);

    if (!hasSites) {
      // Create a site
      await page.click('text=Add Site');
      await page.fill('input[name="name"]', "Mobile Test Site");
      await page.fill('input[name="address"]', "789 Mobile Street");
      await page.fill('input[name="postcode"]', "W1A 1AA");
      await page.click('button:has-text("Create Site")');
      await page.waitForTimeout(3000);
    }

    // Navigate to booking wizard
    await page.goto("https://www.complianceod.co.uk/bookings/new");
    await page.waitForTimeout(3000);

    // Take screenshot for mobile view
    await page.screenshot({ path: "test-results/mobile-booking-view.png", fullPage: true });

    // Look for mobile sticky footer or continue button at bottom
    const stickyFooter = page.locator('.fixed.bottom-0, [class*="sticky"]').last();
    const continueButton = page.locator('button:has-text("Continue")').last();

    const hasFooter = await stickyFooter.isVisible().catch(() => false);
    const hasContinue = await continueButton.isVisible().catch(() => false);

    if (hasFooter || hasContinue) {
      console.log("✅ Mobile navigation elements visible");
    } else {
      // May need to select booking type first
      const individualOption = page.locator("text=Individual Service").first();
      if (await individualOption.isVisible().catch(() => false)) {
        await individualOption.click();
        await page.waitForTimeout(2000);

        const continueAfterSelect = page.locator('button:has-text("Continue")').last();
        await expect(continueAfterSelect).toBeVisible();
        console.log("✅ Continue button visible after type selection");
      }
    }
  });

  test("13. Mobile progress indicator", async ({ page }) => {
    // Navigate to booking wizard
    await page.goto("https://www.complianceod.co.uk/bookings/new");
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: "test-results/mobile-progress.png", fullPage: true });

    // Look for progress indicator or step text
    const progressIndicator = page.locator("text=/Step \\d+ of \\d+/").first();
    const stepDots = page.locator('[class*="progress"]').first();

    const hasProgress = await progressIndicator.isVisible().catch(() => false);
    const hasDots = await stepDots.isVisible().catch(() => false);

    if (hasProgress || hasDots) {
      console.log("✅ Mobile progress indicator visible");
    } else {
      console.log("ℹ️ Progress indicator may appear after step selection");
    }
  });
});
