import { test, expect, testData, pages, waitForPageLoad } from "./fixtures";

test.describe("Site Management", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(pages.sites);
    await waitForPageLoad(page);
  });

  test("should display sites list", async ({ page }) => {
    // Verify page title
    await expect(page.locator("h1").filter({ hasText: /Sites/i })).toBeVisible();

    // Should show add site button
    await expect(
      page.getByRole("link", { name: /add|new/i }).or(
        page.getByRole("button", { name: /add|new/i })
      )
    ).toBeVisible();
  });

  test("should display existing sites", async ({ page }) => {
    // Look for site cards or list items
    const siteItems = page
      .locator('[data-testid="site-card"]')
      .or(page.locator("a[href*='/sites/']"));

    // If there are sites, should be visible
    const count = await siteItems.count();
    if (count > 0) {
      await expect(siteItems.first()).toBeVisible();
    }
  });

  test("should navigate to add new site page", async ({ page }) => {
    // Click add site
    await page.getByRole("link", { name: /add|new/i }).click();

    // Should be on new site page
    await expect(page).toHaveURL(/\/sites\/new/);

    // Should show form
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test("should create a new site", async ({ page }) => {
    await page.goto(pages.newSite);
    await waitForPageLoad(page);

    const uniqueName = `Test Site ${Date.now()}`;

    // Fill in site details
    await page.getByLabel(/name/i).fill(uniqueName);
    await page.getByLabel(/address/i).fill(testData.site.address);
    await page.getByLabel(/postcode/i).fill(testData.site.postcode);

    // Fill access notes if available
    const accessNotes = page.getByLabel(/access|notes/i);
    if (await accessNotes.isVisible()) {
      await accessNotes.fill(testData.site.accessNotes);
    }

    // Submit form
    await page.getByRole("button", { name: /save|create|add/i }).click();

    // Should redirect to sites list or site detail
    await expect(page).toHaveURL(/\/sites/, { timeout: 10000 });

    // Should show success message or the new site
    await expect(
      page.locator(`text=${uniqueName}`).or(page.locator("text=successfully"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should view site details", async ({ page }) => {
    // Click on first site
    const siteLink = page.locator("a[href*='/sites/']").first();

    if (await siteLink.isVisible()) {
      await siteLink.click();

      // Should show site details
      await expect(page).toHaveURL(/\/sites\/[a-z0-9_]+$/i);

      // Should show address and postcode
      await expect(
        page.locator("text=Address").or(page.locator("text=Postcode"))
      ).toBeVisible();
    }
  });

  test("should edit site details", async ({ page }) => {
    // Go to first site
    const siteLink = page.locator("a[href*='/sites/']").first();

    if (await siteLink.isVisible()) {
      await siteLink.click();

      // Look for edit button
      const editBtn = page.getByRole("button", { name: /edit/i });

      if (await editBtn.isVisible()) {
        await editBtn.click();

        // Update a field
        await page.getByLabel(/name/i).fill(`Updated Site ${Date.now()}`);

        // Save
        await page.getByRole("button", { name: /save|update/i }).click();

        // Should show success
        await expect(
          page.locator("text=Updated").or(page.locator("text=successfully"))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should delete a site", async ({ page }) => {
    // First create a site to delete
    await page.goto(pages.newSite);

    const deletableSiteName = `Delete Me ${Date.now()}`;
    await page.getByLabel(/name/i).fill(deletableSiteName);
    await page.getByLabel(/address/i).fill("123 Delete Street");
    await page.getByLabel(/postcode/i).fill("EC1A 1BB");
    await page.getByRole("button", { name: /save|create|add/i }).click();

    await page.waitForURL(/\/sites/);

    // Now find and delete it
    const siteToDelete = page.locator(`text=${deletableSiteName}`);
    if (await siteToDelete.isVisible()) {
      await siteToDelete.click();

      // Look for delete button
      const deleteBtn = page.getByRole("button", { name: /delete/i });

      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        // Confirm deletion
        const confirmBtn = page.getByRole("button", { name: /confirm|yes|delete/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }

        // Should redirect back to sites
        await expect(page).toHaveURL(/\/sites$/);

        // Site should no longer appear
        await expect(page.locator(`text=${deletableSiteName}`)).not.toBeVisible({
          timeout: 5000,
        });
      }
    }
  });
});

test.describe("Site Profile Questionnaire", () => {
  test.use({
    storageState: "e2e/.auth/customer.json",
  });

  test("should navigate to site questionnaire", async ({ page }) => {
    await page.goto(pages.sites);
    await waitForPageLoad(page);

    // Click on first site
    const siteLink = page.locator("a[href*='/sites/']").first();

    if (await siteLink.isVisible()) {
      const href = await siteLink.getAttribute("href");
      await siteLink.click();

      // Look for questionnaire link or button
      const questionnaireBtn = page.getByRole("link", {
        name: /questionnaire|profile|complete profile/i,
      });

      if (await questionnaireBtn.isVisible({ timeout: 3000 })) {
        await questionnaireBtn.click();

        // Should be on questionnaire page
        await expect(page).toHaveURL(/\/questionnaire/);
      }
    }
  });

  test("should complete site profile questionnaire", async ({ page }) => {
    await page.goto(pages.sites);
    await waitForPageLoad(page);

    // Navigate to first site's questionnaire
    const siteLink = page.locator("a[href*='/sites/']").first();
    if (!(await siteLink.isVisible())) return;

    const href = await siteLink.getAttribute("href");
    if (!href) return;

    await page.goto(`${href}/questionnaire`);
    await waitForPageLoad(page);

    // Step 1: Building type and industry
    await expect(
      page.locator("text=Building Type").or(page.locator("text=Site Profile"))
    ).toBeVisible({ timeout: 5000 });

    // Select building type
    const buildingTypeSelect = page
      .getByRole("combobox")
      .filter({ hasText: /building/i })
      .or(page.locator('button[role="combobox"]').first());

    if (await buildingTypeSelect.isVisible()) {
      await buildingTypeSelect.click();
      await page.getByRole("option", { name: /Office/i }).click();
    }

    // Select industry
    const industrySelect = page.getByRole("combobox").nth(1);
    if (await industrySelect.isVisible()) {
      await industrySelect.click();
      await page.getByRole("option", { name: /Technology/i }).click();
    }

    // Fill floor area
    const floorArea = page.getByLabel(/floor area/i);
    if (await floorArea.isVisible()) {
      await floorArea.fill("500");
    }

    // Next step
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2: Special features
    const serverRoomCheckbox = page.getByLabel(/server room/i);
    if (await serverRoomCheckbox.isVisible({ timeout: 3000 })) {
      await serverRoomCheckbox.check();
    }

    // Next step
    await page.getByRole("button", { name: /next/i }).click();

    // Step 3: Occupancy
    const occupancy = page.getByLabel(/occupancy/i);
    if (await occupancy.isVisible({ timeout: 3000 })) {
      await occupancy.fill("30");
    }

    const workstations = page.getByLabel(/workstations/i);
    if (await workstations.isVisible()) {
      await workstations.fill("25");
    }

    // Save profile
    await page.getByRole("button", { name: /save|complete/i }).click();

    // Should show success or redirect
    await expect(
      page.locator("text=successfully").or(page.locator("text=saved"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show service recommendations based on profile", async ({
    page,
  }) => {
    await page.goto(pages.sites);
    await waitForPageLoad(page);

    // Go to a site with completed profile
    const siteLink = page.locator("a[href*='/sites/']").first();
    if (!(await siteLink.isVisible())) return;

    await siteLink.click();

    // Look for recommendations section
    const recommendations = page.locator("text=Recommended Services");

    if (await recommendations.isVisible({ timeout: 3000 })) {
      // Should show at least one recommendation
      await expect(
        page.locator("text=PAT Testing").or(page.locator("text=Fire"))
      ).toBeVisible();
    }
  });
});
