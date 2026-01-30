import { test as setup, expect } from "@playwright/test";
import path from "path";

const STORAGE_STATE_DIR = path.join(__dirname, ".auth");

/**
 * Authentication Setup for Compliance Connect E2E Tests
 *
 * This setup creates authenticated sessions for different user roles.
 * Since we use Clerk, we'll use test accounts or bypass auth in test mode.
 */

// Test user credentials (should be set in .env.test or CI secrets)
const TEST_USERS = {
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || "test-customer@example.com",
    password: process.env.TEST_CUSTOMER_PASSWORD || "TestPassword123!",
  },
  engineer: {
    email: process.env.TEST_ENGINEER_EMAIL || "test-engineer@example.com",
    password: process.env.TEST_ENGINEER_PASSWORD || "TestPassword123!",
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "test-admin@example.com",
    password: process.env.TEST_ADMIN_PASSWORD || "TestPassword123!",
  },
};

setup.describe.configure({ mode: "serial" });

setup("authenticate as customer", async ({ page }) => {
  // Navigate to sign-in page
  await page.goto("/sign-in");

  // Wait for Clerk to load
  await page.waitForSelector('[data-testid="sign-in-form"], .cl-signIn-root', {
    timeout: 10000,
  });

  // Fill in credentials
  await page.getByLabel(/email/i).fill(TEST_USERS.customer.email);
  await page.getByRole("button", { name: /continue/i }).click();

  // Wait for password field and fill
  await page.waitForSelector('input[type="password"]');
  await page.getByLabel(/password/i).fill(TEST_USERS.customer.password);
  await page.getByRole("button", { name: /continue|sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|bookings)/, { timeout: 15000 });

  // Verify we're logged in
  await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, "customer.json"),
  });
});

setup("authenticate as engineer", async ({ page }) => {
  await page.goto("/sign-in");

  await page.waitForSelector('[data-testid="sign-in-form"], .cl-signIn-root', {
    timeout: 10000,
  });

  await page.getByLabel(/email/i).fill(TEST_USERS.engineer.email);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForSelector('input[type="password"]');
  await page.getByLabel(/password/i).fill(TEST_USERS.engineer.password);
  await page.getByRole("button", { name: /continue|sign in/i }).click();

  // Engineers go to /engineer dashboard
  await page.waitForURL(/\/engineer/, { timeout: 15000 });

  await expect(page.locator("text=Hello")).toBeVisible({ timeout: 10000 });

  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, "engineer.json"),
  });
});

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/sign-in");

  await page.waitForSelector('[data-testid="sign-in-form"], .cl-signIn-root', {
    timeout: 10000,
  });

  await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForSelector('input[type="password"]');
  await page.getByLabel(/password/i).fill(TEST_USERS.admin.password);
  await page.getByRole("button", { name: /continue|sign in/i }).click();

  // Admins go to /admin dashboard
  await page.waitForURL(/\/admin/, { timeout: 15000 });

  await expect(page.locator("text=Admin Dashboard")).toBeVisible({
    timeout: 10000,
  });

  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, "admin.json"),
  });
});
