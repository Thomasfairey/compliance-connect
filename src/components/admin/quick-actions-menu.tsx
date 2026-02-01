"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  UserPlus,
  Building2,
  Calendar,
  Zap,
  Download,
  Bell,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuickAction {
  label: string;
  icon: typeof Plus;
  href?: string;
  action?: string;
  shortcut?: string;
}

const quickActions: QuickAction[] = [
  {
    label: "Create Booking",
    icon: Plus,
    href: "/admin/bookings/new",
    shortcut: "B",
  },
  {
    label: "Add Engineer",
    icon: UserPlus,
    href: "/admin/engineers/new",
    shortcut: "E",
  },
  {
    label: "Add Customer",
    icon: Building2,
    href: "/admin/customers/new",
    shortcut: "C",
  },
  {
    label: "Today's Schedule",
    icon: Calendar,
    href: "/admin/scheduling/calendar?date=today",
    shortcut: "T",
  },
  {
    label: "Run Optimization",
    icon: Zap,
    action: "runOptimization",
    shortcut: "O",
  },
];

export function QuickActionsMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleAction = async (action: string) => {
    setOpen(false);

    switch (action) {
      case "runOptimization":
        toast.info("Running route optimization...");
        try {
          // TODO: Call optimization API
          await new Promise((resolve) => setTimeout(resolve, 1500));
          toast.success("Optimization complete");
        } catch {
          toast.error("Optimization failed");
        }
        break;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger with Cmd/Ctrl + Shift + key
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const action = quickActions.find(
          (a) => a.shortcut?.toUpperCase() === e.key.toUpperCase()
        );
        if (action) {
          e.preventDefault();
          if (action.href) {
            router.push(action.href);
          } else if (action.action) {
            handleAction(action.action);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Quick actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => {
          const Icon = action.icon;

          if (action.href) {
            return (
              <DropdownMenuItem key={action.label} asChild>
                <Link
                  href={action.href}
                  className="flex items-center justify-between w-full"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </span>
                  {action.shortcut && (
                    <span className="text-xs text-gray-400">
                      ⌘⇧{action.shortcut}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem
              key={action.label}
              onClick={() => action.action && handleAction(action.action)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {action.label}
              </span>
              {action.shortcut && (
                <span className="text-xs text-gray-400">
                  ⌘⇧{action.shortcut}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
