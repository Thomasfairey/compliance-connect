"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Shield, Users, Calendar, Clock, LogOut } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";
import { adminNavItems, type NavItem } from "./admin-nav-config";

interface AdminSidebarProps {
  userName: string;
  collapsed?: boolean;
}

export function AdminSidebar({ userName, collapsed = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand the active section on mount
  useEffect(() => {
    for (const item of adminNavItems) {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) =>
            pathname === child.href || pathname.startsWith(child.href + "/")
        );
        if (isChildActive && !expandedItems.includes(item.id)) {
          setExpandedItems((prev) => [...prev, item.id]);
        }
      }
    }
  }, [pathname]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (item.children) {
      return item.children.some(
        (child) =>
          pathname === child.href || pathname.startsWith(child.href + "/")
      );
    }
    return pathname.startsWith(item.href + "/");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <Link href="/admin" className="flex items-center gap-2 px-6 py-5 border-b hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-lg">OfficeTest Admin</span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            pathname={pathname}
            isActive={isItemActive(item)}
            isExpanded={expandedItems.includes(item.id)}
            onToggle={() => toggleExpand(item.id)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer Stats */}
      <div className="border-t p-4">
        {!collapsed && (
          <div className="space-y-2 text-sm">
            <SidebarStat
              icon={Calendar}
              label="Today's Bookings"
              value="24"
            />
            <SidebarStat
              icon={Users}
              label="Active Engineers"
              value="8"
            />
            <SidebarStat
              icon={Clock}
              label="Pending Issues"
              value="3"
              highlight
            />
            <div className="pt-2 mt-2 border-t">
              <SignOutButton
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  pathname: string;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  collapsed: boolean;
}

function NavItemComponent({
  item,
  pathname,
  isActive,
  isExpanded,
  onToggle,
  collapsed,
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div>
      <Link
        href={hasChildren ? "#" : item.href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
          isActive
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            )}
          </>
        )}
      </Link>

      {/* Children */}
      {hasChildren && isExpanded && !collapsed && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children!.map((child) => {
            const isChildActive =
              pathname === child.href ||
              pathname.startsWith(child.href + "/");

            return (
              <Link
                key={child.id}
                href={child.href}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm transition-colors",
                  isChildActive
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarStatProps {
  icon: typeof Calendar;
  label: string;
  value: string;
  highlight?: boolean;
}

function SidebarStat({ icon: Icon, label, value, highlight }: SidebarStatProps) {
  return (
    <div className="flex items-center justify-between text-gray-500">
      <span className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span
        className={cn(
          "font-medium",
          highlight ? "text-red-600" : "text-gray-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}
