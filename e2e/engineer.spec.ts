import { test, expect, pages, waitForPageLoad } from "./fixtures";

test.describe("Engineer Dashboard", () => {
  test.use({
    storageState: "e2e/.auth/engineer.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.engineer);
    await waitForPageLoad(page);
  });

  test("should display engineer dashboard", async ({ page }) => {
    // Verify welcome message
    await expect(page.locator("text=Hello")).toBeVisible();

    // Should show quick links
    await expect(page.locator("text=My Jobs")).toBeVisible();
    await expect(page.locator("text=Schedule")).toBeVisible();
    await expect(page.locator("text=My Profile")).toBeVisible();
  });

  test("should navigate to jobs page", async ({ page }) => {
    await page.click("text=My Jobs");

    await expect(page).toHaveURL(/\/engineer\/jobs/);
    await expect(page.locator("h1").filter({ hasText: /Jobs/i })).toBeVisible();
  });

  test("should navigate to profile page", async ({ page }) => {
    await page.click("text=My Profile");

    await expect(page).toHaveURL(/\/engineer\/profile/);
  });
});

test.describe("Engineer Jobs", () => {
  test.use({
    storageState: "e2e/.auth/engineer.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.engineerJobs);
    await waitForPageLoad(page);
  });

  test("should display jobs page with tabs", async ({ page }) => {
    // Verify page title
    await expect(page.locator("h1").filter({ hasText: /Jobs/i })).toBeVisible();

    // Should show tabs for Active, Available, Completed
    await expect(page.locator("text=Active")).toBeVisible();
    await expect(page.locator("text=Available")).toBeVisible();
    await expect(page.locator("text=Completed")).toBeVisible();
  });

  test("should display active jobs tab", async ({ page }) => {
    // Click active tab (should be default)
    await page.click("text=Active");

    // Should show active jobs or empty state
    await expect(
      page.locator("text=No active jobs").or(page.locator('[class*="card"]'))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display available jobs tab", async ({ page }) => {
    await page.click("text=Available");

    // Should show available jobs or empty state
    await expect(
      page.locator("text=No available jobs").or(page.locator('[class*="card"]'))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display completed jobs tab", async ({ page }) => {
    await page.click("text=Completed");

    // Should show completed jobs or empty state
    await expect(
      page.locator("text=No completed jobs").or(page.locator('[class*="card"]'))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should view job details", async ({ page }) => {
    // Click on first job card/link if available
    const jobLink = page.locator("a[href*='/engineer/jobs/']").first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Should show job details
      await expect(page).toHaveURL(/\/engineer\/jobs\/[a-z0-9]+/i);

      // Should show service name and status
      await expect(
        page.locator("text=Status").or(page.locator("text=Job Details"))
      ).toBeVisible();
    }
  });

  test("should claim an available job", async ({ page }) => {
    // Go to available tab
    await page.click("text=Available");

    // Find a job to claim
    const jobLink = page.locator("a[href*='/engineer/jobs/']").first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Look for claim/accept button
      const claimBtn = page.getByRole("button", { name: /claim|accept|take/i });

      if (await claimBtn.isVisible({ timeout: 3000 })) {
        await claimBtn.click();

        // Should show success message or status change
        await expect(
          page.locator("text=Claimed").or(page.locator("text=Assigned"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should start a confirmed job", async ({ page }) => {
    // Look for a confirmed job in active tab
    const jobLink = page.locator("a[href*='/engineer/jobs/']").first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Look for start button
      const startBtn = page.getByRole("button", { name: /start|begin/i });

      if (await startBtn.isVisible({ timeout: 3000 })) {
        await startBtn.click();

        // Should show in progress status
        await expect(
          page.locator("text=In Progress").or(page.locator("text=Started"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should add asset test results", async ({ page }) => {
    // Find an in-progress job
    const jobLink = page
      .locator("a[href*='/engineer/jobs/']")
      .filter({ has: page.locator("text=In Progress") })
      .first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Look for add asset form
      const assetNameInput = page.getByLabel(/name|asset/i);

      if (await assetNameInput.isVisible({ timeout: 3000 })) {
        // Fill asset details
        await assetNameInput.fill("Test Kettle");

        const locationInput = page.getByLabel(/location/i);
        if (await locationInput.isVisible()) {
          await locationInput.fill("Kitchen");
        }

        // Select pass/fail status
        const passBtn = page.getByRole("button", { name: /pass/i });
        if (await passBtn.isVisible()) {
          await passBtn.click();
        }

        // Add asset
        const addBtn = page.getByRole("button", { name: /add|save/i });
        await addBtn.click();

        // Should show asset in list
        await expect(page.locator("text=Test Kettle")).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test("should complete a job", async ({ page }) => {
    // Find a job with assets
    const jobLink = page.locator("a[href*='/engineer/jobs/']").first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Look for complete button
      const completeBtn = page.getByRole("button", { name: /complete|finish/i });

      if (await completeBtn.isVisible({ timeout: 3000 })) {
        await completeBtn.click();

        // Confirm if needed
        const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
        }

        // Should show completed status
        await expect(
          page.locator("text=Completed").or(page.locator("text=completed"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should get directions to site", async ({ page }) => {
    const jobLink = page.locator("a[href*='/engineer/jobs/']").first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Look for directions button
      const directionsBtn = page.getByRole("link", { name: /directions/i });

      if (await directionsBtn.isVisible()) {
        // Should have Google Maps URL
        const href = await directionsBtn.getAttribute("href");
        expect(href).toContain("google.com/maps");
      }
    }
  });

  test("should call customer", async ({ page }) => {
    const jobLink = page.locator("a[href*='/engineer/jobs/']").first();

    if (await jobLink.isVisible({ timeout: 3000 })) {
      await jobLink.click();

      // Look for call button
      const callBtn = page.getByRole("link", { name: /call/i });

      if (await callBtn.isVisible()) {
        // Should have tel: URL
        const href = await callBtn.getAttribute("href");
        expect(href).toContain("tel:");
      }
    }
  });
});

test.describe("Engineer Notifications", () => {
  test.use({
    storageState: "e2e/.auth/engineer.json",
  });

  test("should display notification bell", async ({ page }) => {
    await page.goto(pages.engineer);
    await waitForPageLoad(page);

    // Should show notification bell in header
    const notificationBell = page.locator('[aria-label*="notification"]').or(
      page.locator("button").filter({ has: page.locator('svg[class*="bell"]') })
    );

    await expect(notificationBell).toBeVisible({ timeout: 5000 });
  });

  test("should open notification dropdown", async ({ page }) => {
    await page.goto(pages.engineer);
    await waitForPageLoad(page);

    // Click notification bell
    const notificationBell = page.locator('button').filter({
      has: page.locator('svg'),
    }).first();

    if (await notificationBell.isVisible()) {
      await notificationBell.click();

      // Should show notification dropdown
      await expect(
        page.locator("text=Notifications").or(page.locator("text=No notifications"))
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test("should mark notification as read", async ({ page }) => {
    await page.goto(pages.engineer);
    await waitForPageLoad(page);

    // Click notification bell
    const notificationBell = page.locator("button").first();
    await notificationBell.click();

    // If there are unread notifications
    const unreadNotification = page.locator('[class*="unread"]').first();

    if (await unreadNotification.isVisible({ timeout: 3000 })) {
      await unreadNotification.click();

      // Should mark as read
      await page.waitForTimeout(1000);

      // Unread indicator should be gone
      await expect(unreadNotification).not.toHaveClass(/unread/);
    }
  });
});

test.describe("Engineer Mobile Experience", () => {
  test.use({
    storageState: "e2e/.auth/engineer.json",
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
  });

  test("should display mobile bottom navigation", async ({ page }) => {
    await page.goto(pages.engineer);
    await waitForPageLoad(page);

    // Should show bottom nav on mobile
    const bottomNav = page.locator("nav").filter({
      has: page.locator("text=Dashboard").or(page.locator("text=My Jobs")),
    });

    await expect(bottomNav).toBeVisible();
  });

  test("should navigate via mobile bottom nav", async ({ page }) => {
    await page.goto(pages.engineer);
    await waitForPageLoad(page);

    // Click My Jobs in bottom nav
    await page.click("text=My Jobs");

    await expect(page).toHaveURL(/\/engineer\/jobs/);
  });

  test("should display job cards correctly on mobile", async ({ page }) => {
    await page.goto(pages.engineerJobs);
    await waitForPageLoad(page);

    // Job cards should be full width on mobile
    const jobCard = page.locator('[class*="card"]').first();

    if (await jobCard.isVisible({ timeout: 3000 })) {
      const box = await jobCard.boundingBox();
      if (box) {
        // Card should be nearly full viewport width (accounting for padding)
        expect(box.width).toBeGreaterThan(300);
      }
    }
  });
});
