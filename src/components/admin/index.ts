/**
 * Admin Components
 *
 * Shared components for the admin dashboard.
 */

// Layout & Navigation
export { AdminSidebar } from "./admin-sidebar";
export { AdminPageHeader, AdminPage } from "./admin-page-header";
export { QuickActionsMenu } from "./quick-actions-menu";

// Navigation Config
export {
  adminNavItems,
  generateBreadcrumbs,
  getPageInfo,
  type NavItem,
  type NavChild,
} from "./admin-nav-config";

// Scheduling Components
export { WeightSliders } from "./scheduling/weight-sliders";
export { PricingControls, type PricingRules } from "./scheduling/pricing-controls";
