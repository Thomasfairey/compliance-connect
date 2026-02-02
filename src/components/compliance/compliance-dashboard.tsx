"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { enableAutoRebook, disableAutoRebook } from "@/lib/actions/compliance";
import { toast } from "sonner";
import Link from "next/link";
import type { ComplianceStatus } from "@/lib/actions/compliance";

type ComplianceDashboardProps = {
  statuses: ComplianceStatus[];
};

export function ComplianceDashboard({ statuses }: ComplianceDashboardProps) {
  const overdue = statuses.filter((s) => s.status === "OVERDUE");
  const dueSoon = statuses.filter((s) => s.status === "DUE_SOON");
  const current = statuses.filter((s) => s.status === "CURRENT");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className={overdue.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  overdue.length > 0 ? "bg-red-100" : "bg-gray-100"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    overdue.length > 0 ? "text-red-600" : "text-gray-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdue.length}</p>
                <p className="text-sm text-gray-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dueSoon.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  dueSoon.length > 0 ? "bg-amber-100" : "bg-gray-100"
                }`}
              >
                <Clock
                  className={`h-5 w-5 ${
                    dueSoon.length > 0 ? "text-amber-600" : "text-gray-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueSoon.length}</p>
                <p className="text-sm text-gray-500">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{current.length}</p>
                <p className="text-sm text-gray-500">Current</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Items */}
      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Overdue Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdue.map((item) => (
              <ComplianceItem key={`${item.siteId}-${item.serviceId}`} item={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Due Soon */}
      {dueSoon.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Due Within 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueSoon.map((item) => (
              <ComplianceItem key={`${item.siteId}-${item.serviceId}`} item={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Current */}
      {current.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Up to Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.slice(0, 5).map((item) => (
              <ComplianceItem key={`${item.siteId}-${item.serviceId}`} item={item} />
            ))}
            {current.length > 5 && (
              <p className="text-sm text-gray-500 text-center pt-2">
                And {current.length - 5} more...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComplianceItem({ item }: { item: ComplianceStatus }) {
  const [isLoading, setIsLoading] = useState(false);
  const [autoRebook, setAutoRebook] = useState(item.autoRebookEnabled);

  const handleToggleAutoRebook = async () => {
    setIsLoading(true);
    try {
      if (autoRebook) {
        const result = await disableAutoRebook(item.siteId, item.serviceId);
        if (result.success) {
          setAutoRebook(false);
          toast.success("Auto-rebook disabled");
        }
      } else {
        const result = await enableAutoRebook(item.siteId, item.serviceId, {});
        if (result.success) {
          setAutoRebook(true);
          toast.success("Auto-rebook enabled");
        }
      }
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = {
    OVERDUE: (
      <Badge variant="destructive">
        {Math.abs(item.daysUntilDue)} days overdue
      </Badge>
    ),
    DUE_SOON: (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        Due in {item.daysUntilDue} days
      </Badge>
    ),
    CURRENT: (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        Due in {item.daysUntilDue} days
      </Badge>
    ),
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{item.serviceName}</p>
          {statusBadge[item.status]}
        </div>
        <p className="text-sm text-gray-500">{item.siteName}</p>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          {item.lastTestDate && (
            <span>Last tested: {formatDate(item.lastTestDate)}</span>
          )}
          <span>Next due: {formatDate(item.nextDueDate)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleAutoRebook}
          disabled={isLoading}
          className={autoRebook ? "text-blue-600" : "text-gray-400"}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          {autoRebook ? "Auto" : "Manual"}
        </Button>

        <Link
          href={`/bookings/new?siteId=${item.siteId}&serviceId=${item.serviceId}&bookingType=individual`}
        >
          <Button size="sm">
            Book Now
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
