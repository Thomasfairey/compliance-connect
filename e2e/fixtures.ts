import { test as base, expect, Page } from "@playwright/test";
import path from "path";

const STORAGE_STATE_DIR = path.join(__dirname, ".auth");

/**
 * Custom test fixtures for Compliance Connect
 * Provides pre-authenticated contexts for different user roles
 */

type AuthFixtures = {
  customerPage: Page;
  engineerPage: Page;
  adminPage: Page;
};

// Create fixtures with different auth states
export const test = base.extend<AuthFixtures>({
  // Customer authenticated context
  customerPage: async ({ browser }, callback) => {
    const context = await browser.newContext({
      storageState: path.join(STORAGE_STATE_DIR, "customer.json"),
    });
    const page = await context.newPage();
    await callback(page);
    await context.close();
  },

  // Engineer authenticated context
  engineerPage: async ({ browser }, callback) => {
    const context = await browser.newContext({
      storageState: path.join(STORAGE_STATE_DIR, "engineer.json"),
    });
    const page = await context.newPage();
    await callback(page);
    await context.close();
  },

  // Admin authenticated context
  adminPage: async ({ browser }, callback) => {
    const context = await browser.newContext({
      storageState: path.join(STORAGE_STATE_DIR, "admin.json"),
    });
    const page = await context.newPage();
    await callback(page);
    await context.close();
  },
});

export { expect };

/**
 * Test data helpers
 */
export const testData = {
  site: {
    name: `Test Site ${Date.now()}`,
    address: "123 Test Street",
    postcode: "EC1A 1BB",
    accessNotes: "Ring buzzer 42",
  },

  booking: {
    estimatedQty: 50,
    notes: "E2E test booking",
  },

  siteProfile: {
    buildingType: "OFFICE",
    industryType: "TECHNOLOGY",
    floorArea: 500,
    numberOfFloors: 2,
    numberOfRooms: 10,
    hasServerRoom: true,
    hasPublicAccess: false,
    typicalOccupancy: 30,
    numberOfWorkstations: 25,
  },
};

/**
 * Page Object helpers
 */
export const pages = {
  dashboard: "/dashboard",
  bookings: "/bookings",
  newBooking: "/bookings/new",
  bundles: "/bookings/bundles",
  sites: "/sites",
  newSite: "/sites/new",
  compliance: "/compliance",
  engineer: "/engineer",
  engineerJobs: "/engineer/jobs",
  admin: "/admin",
  adminBookings: "/admin/bookings",
  adminEngineers: "/admin/engineers",
};

/**
 * Common test actions
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function selectFromDropdown(
  page: Page,
  triggerText: string,
  optionText: string
) {
  await page.getByRole("combobox").filter({ hasText: triggerText }).click();
  await page.getByRole("option", { name: optionText }).click();
}

export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    const input = page.getByLabel(new RegExp(label, "i"));
    await input.fill(value);
  }
}
