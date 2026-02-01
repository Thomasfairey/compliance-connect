/**
 * Admin Navigation Configuration
 *
 * Defines all admin navigation items with their sub-items,
 * icons, and descriptions for the expandable sidebar.
 */

import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Wrench,
  Users,
  Shield,
  Settings,
  BarChart3,
  Scale,
  MapPin,
  Gauge,
  Route,
  Zap,
  PoundSterling,
  Bell,
  Plug,
  Palette,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description?: string;
  children?: NavChild[];
}

export interface NavChild {
  id: string;
  label: string;
  href: string;
}

export const adminNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    description: "Overview & alerts",
  },
  {
    id: "scheduling",
    label: "Scheduling",
    icon: Calendar,
    href: "/admin/scheduling",
    description: "Control allocation & routing",
    children: [
      { id: "scheduling-control", label: "Control Panel", href: "/admin/scheduling/control" },
      { id: "scheduling-calendar", label: "Master Calendar", href: "/admin/scheduling/calendar" },
      { id: "scheduling-optimization", label: "Optimization", href: "/admin/scheduling/optimization" },
    ],
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: ClipboardList,
    href: "/admin/bookings",
    description: "Manage all bookings",
    children: [
      { id: "bookings-all", label: "All Bookings", href: "/admin/bookings" },
      { id: "bookings-new", label: "Create Booking", href: "/admin/bookings/new" },
      { id: "bookings-pending", label: "Pending Allocation", href: "/admin/bookings/pending" },
      { id: "bookings-issues", label: "Issues & Escalations", href: "/admin/bookings/issues" },
    ],
  },
  {
    id: "engineers",
    label: "Engineers",
    icon: Wrench,
    href: "/admin/engineers",
    description: "Engineer management",
    children: [
      { id: "engineers-all", label: "All Engineers", href: "/admin/engineers" },
      { id: "engineers-availability", label: "Availability", href: "/admin/engineers/availability" },
      { id: "engineers-performance", label: "Performance", href: "/admin/engineers/performance" },
      { id: "engineers-qualifications", label: "Qualifications", href: "/admin/engineers/qualifications" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    href: "/admin/customers",
    description: "Customer management",
  },
  {
    id: "users",
    label: "Users & Access",
    icon: Shield,
    href: "/admin/users",
    description: "Permissions & roles",
    children: [
      { id: "users-all", label: "All Users", href: "/admin/users" },
      { id: "users-roles", label: "Roles & Permissions", href: "/admin/users/roles" },
      { id: "users-invites", label: "Invitations", href: "/admin/users/invites" },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: Briefcase,
    href: "/admin/services",
    description: "Service catalog",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
    description: "System configuration",
    children: [
      { id: "settings-pricing", label: "Pricing", href: "/admin/settings/pricing" },
      { id: "settings-regions", label: "Regions & Zones", href: "/admin/settings/regions" },
      { id: "settings-notifications", label: "Notifications", href: "/admin/settings/notifications" },
      { id: "settings-system", label: "System", href: "/admin/settings/system" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    href: "/admin/reports",
    description: "Analytics & exports",
  },
];

/**
 * Generate breadcrumbs from the current pathname
 */
export function generateBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: "Admin", href: "/admin" },
  ];

  if (pathname === "/admin") {
    return crumbs;
  }

  // Find matching nav item and children
  for (const item of adminNavItems) {
    if (pathname === item.href) {
      crumbs.push({ label: item.label, href: item.href });
      return crumbs;
    }

    if (item.children) {
      for (const child of item.children) {
        if (pathname === child.href || pathname.startsWith(child.href + "/")) {
          crumbs.push({ label: item.label, href: item.href });
          crumbs.push({ label: child.label, href: child.href });

          // Check for deeper paths (e.g., /admin/bookings/[id])
          const remaining = pathname.replace(child.href, "").replace(/^\//, "");
          if (remaining && !remaining.startsWith("?")) {
            // Likely a detail page
            crumbs.push({ label: "Details", href: pathname });
          }
          return crumbs;
        }
      }
    }

    // Check if it's a detail page under this item
    if (pathname.startsWith(item.href + "/")) {
      crumbs.push({ label: item.label, href: item.href });

      // Extract the ID or subpath
      const subpath = pathname.replace(item.href + "/", "");
      if (subpath && !subpath.includes("/")) {
        crumbs.push({ label: "Details", href: pathname });
      }
      return crumbs;
    }
  }

  return crumbs;
}

/**
 * Get the current page's description based on pathname
 */
export function getPageInfo(pathname: string): { title: string; description?: string } {
  // Check for exact match first
  for (const item of adminNavItems) {
    if (pathname === item.href) {
      return { title: item.label, description: item.description };
    }

    if (item.children) {
      for (const child of item.children) {
        if (pathname === child.href) {
          return { title: child.label };
        }
      }
    }
  }

  // Default fallback
  return { title: "Admin" };
}
