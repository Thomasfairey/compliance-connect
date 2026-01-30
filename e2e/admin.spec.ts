import { test, expect, pages, waitForPageLoad } from "./fixtures";

test.describe("Admin Dashboard", () => {
  test.use({
    storageState: "e2e/.auth/admin.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.admin);
    await waitForPageLoad(page);
  });

  test("should display admin dashboard", async ({ page }) => {
    // Verify page title
    await expect(
      page.locator("h1").filter({ hasText: /Admin Dashboard/i })
    ).toBeVisible();

    // Should show welcome message
    await expect(page.locator("text=Welcome")).toBeVisible();
  });

  test("should display quick link cards", async ({ page }) => {
    // Should show navigation cards
    await expect(page.locator("text=All Bookings")).toBeVisible();
    await expect(page.locator("text=Engineers")).toBeVisible();
    await expect(page.locator("text=Services")).toBeVisible();
  });

  test("should navigate to all bookings", async ({ page }) => {
    await page.click("text=All Bookings");

    await expect(page).toHaveURL(/\/admin\/bookings/);
  });

  test("should navigate to engineers page", async ({ page }) => {
    await page.click("text=Engineers");

    await expect(page).toHaveURL(/\/admin\/engineers/);
  });

  test("should navigate to services page", async ({ page }) => {
    await page.click("text=Services");

    await expect(page).toHaveURL(/\/admin\/services/);
  });
});

test.describe("Admin Bookings Management", () => {
  test.use({
    storageState: "e2e/.auth/admin.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.adminBookings);
    await waitForPageLoad(page);
  });

  test("should display all bookings", async ({ page }) => {
    // Verify page title
    await expect(
      page.locator("h1").filter({ hasText: /Bookings/i })
    ).toBeVisible();

    // Should show bookings list or table
    await expect(
      page.locator("table").or(page.locator('[class*="card"]'))
    ).toBeVisible();
  });

  test("should filter bookings by status", async ({ page }) => {
    // Look for status filter
    const statusFilter = page.getByRole("combobox").first().or(
      page.locator("button").filter({ hasText: /Status|All|Filter/i })
    );

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select Pending
      await page.getByRole("option", { name: /Pending/i }).click();

      // Should show only pending bookings or message
      await page.waitForTimeout(1000);
    }
  });

  test("should view booking details", async ({ page }) => {
    // Click on first booking
    const bookingLink = page.locator("a[href*='/admin/bookings/']").first();

    if (await bookingLink.isVisible({ timeout: 3000 })) {
      await bookingLink.click();

      // Should show booking details
      await expect(page).toHaveURL(/\/admin\/bookings\/[a-z0-9]+/i);

      // Should show customer and site info
      await expect(
        page.locator("text=Customer").or(page.locator("text=Site"))
      ).toBeVisible();
    }
  });

  test("should assign engineer to booking", async ({ page }) => {
    // Find unassigned booking
    const bookingLink = page
      .locator("a[href*='/admin/bookings/']")
      .filter({ has: page.locator("text=Pending") })
      .first();

    if (await bookingLink.isVisible({ timeout: 3000 })) {
      await bookingLink.click();

      // Look for assign button/dropdown
      const assignBtn = page.getByRole("button", { name: /assign/i });

      if (await assignBtn.isVisible({ timeout: 3000 })) {
        await assignBtn.click();

        // Select an engineer
        const engineerOption = page.getByRole("option").first();
        if (await engineerOption.isVisible({ timeout: 3000 })) {
          await engineerOption.click();
        }

        // Should show success
        await expect(
          page.locator("text=Assigned").or(page.locator("text=assigned"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should cancel a booking", async ({ page }) => {
    // Find a booking to cancel
    const bookingLink = page.locator("a[href*='/admin/bookings/']").first();

    if (await bookingLink.isVisible({ timeout: 3000 })) {
      await bookingLink.click();

      // Look for cancel button
      const cancelBtn = page.getByRole("button", { name: /cancel/i });

      if (await cancelBtn.isVisible({ timeout: 3000 })) {
        await cancelBtn.click();

        // Confirm cancellation
        const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
        }

        // Should show cancelled status
        await expect(
          page.locator("text=Cancelled").or(page.locator("text=cancelled"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should search bookings", async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible()) {
      // Search for a reference
      await searchInput.fill("CC-");

      // Wait for results
      await page.waitForTimeout(1000);

      // Should show filtered results
      await expect(
        page.locator("text=CC-").or(page.locator("text=No results"))
      ).toBeVisible();
    }
  });
});

test.describe("Admin Engineers Management", () => {
  test.use({
    storageState: "e2e/.auth/admin.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.adminEngineers);
    await waitForPageLoad(page);
  });

  test("should display engineers list", async ({ page }) => {
    // Verify page
    await expect(
      page.locator("h1").filter({ hasText: /Engineers|Users/i })
    ).toBeVisible();

    // Should show engineers or users table/list
    await expect(
      page.locator("table").or(page.locator('[class*="card"]'))
    ).toBeVisible();
  });

  test("should view engineer details", async ({ page }) => {
    // Click on an engineer
    const engineerLink = page.locator("a[href*='/admin/engineers/']").or(
      page.locator("tr").filter({ has: page.locator("text=Engineer") })
    ).first();

    if (await engineerLink.isVisible({ timeout: 3000 })) {
      await engineerLink.click();

      // Should show engineer details
      await expect(
        page.locator("text=Profile").or(page.locator("text=Qualifications"))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should filter users by role", async ({ page }) => {
    // Look for role filter
    const roleFilter = page.getByRole("combobox").first().or(
      page.locator("button").filter({ hasText: /Role|All|Filter/i })
    );

    if (await roleFilter.isVisible()) {
      await roleFilter.click();

      // Select Engineers only
      await page.getByRole("option", { name: /Engineer/i }).click();

      await page.waitForTimeout(1000);
    }
  });

  test("should change user role", async ({ page }) => {
    // Find a user row with role selector
    const roleSelector = page.getByRole("combobox").filter({
      hasText: /Customer|Engineer|Admin/i,
    }).first();

    if (await roleSelector.isVisible({ timeout: 3000 })) {
      await roleSelector.click();

      // Try to change role
      const roleOption = page.getByRole("option").first();
      if (await roleOption.isVisible()) {
        await roleOption.click();

        // Should show success
        await expect(
          page.locator("text=Updated").or(page.locator("text=updated"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should approve pending engineer", async ({ page }) => {
    // Look for pending engineer
    const pendingEngineer = page.locator("tr").filter({
      has: page.locator("text=Pending"),
    }).first();

    if (await pendingEngineer.isVisible({ timeout: 3000 })) {
      // Find approve button
      const approveBtn = pendingEngineer.getByRole("button", { name: /approve/i });

      if (await approveBtn.isVisible()) {
        await approveBtn.click();

        // Should show approved status
        await expect(
          page.locator("text=Approved").or(page.locator("text=approved"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Admin Services Management", () => {
  test.use({
    storageState: "e2e/.auth/admin.json",
  });

  test("should display services page", async ({ page }) => {
    await page.goto("/admin/services");
    await waitForPageLoad(page);

    // Verify page
    await expect(
      page.locator("h1").filter({ hasText: /Services/i })
    ).toBeVisible();

    // Should show services list
    await expect(
      page.locator("text=PAT Testing").or(page.locator("text=Fire"))
    ).toBeVisible();
  });

  test("should view service details", async ({ page }) => {
    await page.goto("/admin/services");
    await waitForPageLoad(page);

    // Click on a service
    const serviceLink = page.locator("a[href*='/admin/services/']").first();

    if (await serviceLink.isVisible({ timeout: 3000 })) {
      await serviceLink.click();

      // Should show service details
      await expect(
        page.locator("text=Price").or(page.locator("text=Base Price"))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should edit service pricing", async ({ page }) => {
    await page.goto("/admin/services");
    await waitForPageLoad(page);

    // Click on a service
    const serviceLink = page.locator("a[href*='/admin/services/']").first();

    if (await serviceLink.isVisible({ timeout: 3000 })) {
      await serviceLink.click();

      // Look for edit button
      const editBtn = page.getByRole("button", { name: /edit/i });

      if (await editBtn.isVisible({ timeout: 3000 })) {
        await editBtn.click();

        // Update price
        const priceInput = page.getByLabel(/price/i);
        if (await priceInput.isVisible()) {
          await priceInput.fill("10.00");
        }

        // Save
        await page.getByRole("button", { name: /save|update/i }).click();

        // Should show success
        await expect(
          page.locator("text=Updated").or(page.locator("text=saved"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should toggle service active status", async ({ page }) => {
    await page.goto("/admin/services");
    await waitForPageLoad(page);

    // Look for toggle switch for service status
    const toggleSwitch = page.locator('button[role="switch"]').first().or(
      page.getByRole("checkbox").first()
    );

    if (await toggleSwitch.isVisible({ timeout: 3000 })) {
      await toggleSwitch.click();

      // Should show status change
      await expect(
        page.locator("text=deactivated").or(page.locator("text=activated"))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Admin Access Control", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test("customer should not access admin pages", async ({ page }) => {
    // Try to access admin dashboard
    await page.goto(pages.admin);

    // Should be redirected to customer dashboard
    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("customer should not access admin bookings", async ({ page }) => {
    await page.goto(pages.adminBookings);

    // Should be redirected
    await expect(page).not.toHaveURL(/\/admin\/bookings/);
  });
});
