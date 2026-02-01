"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, PoundSterling, User } from "lucide-react";

const navItems = [
  { id: "today", label: "Today", icon: Home, href: "/engineer" },
  { id: "calendar", label: "Calendar", icon: Calendar, href: "/engineer/calendar" },
  { id: "earnings", label: "Earnings", icon: PoundSterling, href: "/engineer/earnings" },
  { id: "profile", label: "Profile", icon: User, href: "/engineer/profile" },
];

interface BottomNavProps {
  current?: string;
}

export function BottomNav({ current }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (item: typeof navItems[0]) => {
    if (current) return current === item.id;
    if (item.href === "/engineer") return pathname === "/engineer";
    return pathname.startsWith(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <item.icon className={`w-6 h-6 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-xs mt-1 ${active ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
