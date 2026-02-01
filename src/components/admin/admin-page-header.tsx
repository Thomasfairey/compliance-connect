"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateBreadcrumbs } from "./admin-nav-config";

interface AdminPageHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  showBackButton = true,
  onRefresh,
  isRefreshing,
}: AdminPageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Show back button if we're deeper than the dashboard
  const canGoBack = breadcrumbs.length > 1 && showBackButton;

  return (
    <div className="bg-white border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm mb-2">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}
          <div>
            {title && (
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("w-4 h-4", isRefreshing && "animate-spin")}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component for consistent admin page layout
 */
export function AdminPage({
  title,
  description,
  actions,
  children,
  showBackButton,
  onRefresh,
  isRefreshing,
}: AdminPageHeaderProps & { children: React.ReactNode }) {
  return (
    <div>
      <AdminPageHeader
        title={title}
        description={description}
        actions={actions}
        showBackButton={showBackButton}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
      {children}
    </div>
  );
}
