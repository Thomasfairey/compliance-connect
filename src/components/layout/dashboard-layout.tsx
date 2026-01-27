"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Menu,
  X,
  Shield,
  Wrench,
  Users,
  Settings,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Role } from "@prisma/client";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: Role;
  userName: string;
}

const customerNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/sites", label: "Sites", icon: Building2 },
];

const engineerNavItems = [
  { href: "/engineer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/engineer/jobs", label: "My Jobs", icon: ClipboardList },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "All Bookings", icon: Calendar },
  { href: "/admin/engineers", label: "Users", icon: Users },
  { href: "/admin/services", label: "Services", icon: Settings },
];

export function DashboardLayout({
  children,
  userRole,
  userName,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getNavItems = () => {
    switch (userRole) {
      case "ENGINEER":
        return engineerNavItems;
      case "ADMIN":
        return adminNavItems;
      default:
        return customerNavItems;
    }
  };

  const navItems = getNavItems();

  const NavLink = ({ item }: { item: (typeof customerNavItems)[0] }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        item.href !== "/engineer" &&
        item.href !== "/admin" &&
        pathname.startsWith(item.href));

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-black text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 mb-8">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Compliance Connect</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10",
                  },
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Compliance Connect</span>
          </Link>

          <div className="flex items-center gap-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex flex-col h-full pt-6">
                  <div className="px-4 mb-6">
                    <p className="text-sm font-medium text-gray-900">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {userRole.toLowerCase()}
                    </p>
                  </div>
                  <nav className="flex-1 px-2 space-y-1">
                    {navItems.map((item) => (
                      <NavLink key={item.href} item={item} />
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation for Engineer */}
      {userRole === "ENGINEER" && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
          <div className="flex items-center justify-around h-16">
            {engineerNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/engineer" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                    isActive ? "text-black" : "text-gray-400"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main content */}
      <main
        className={cn(
          "lg:pl-64 pt-16 lg:pt-0 min-h-screen",
          userRole === "ENGINEER" && "pb-20 lg:pb-0"
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
