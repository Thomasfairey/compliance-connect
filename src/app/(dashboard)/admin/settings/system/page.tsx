import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Database,
  Server,
  Shield,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { SCHEDULING_VERSION } from "@/lib/scheduling/v2";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Settings | Admin",
  description: "Advanced configuration and maintenance",
};

export default async function SystemPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get system stats
  const [userCount, bookingCount, serviceCount, engineerCount] = await Promise.all([
    db.user.count(),
    db.booking.count(),
    db.service.count(),
    db.user.count({ where: { role: "ENGINEER" } }),
  ]);

  return (
    <AdminPage
      title="System Settings"
      description="Advanced configuration and maintenance options"
    >
      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">System Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operational</div>
            <div className="text-sm text-gray-600 mt-1">All services running normally</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Database</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Users</div>
                <div className="font-semibold">{userCount}</div>
              </div>
              <div>
                <div className="text-gray-500">Bookings</div>
                <div className="font-semibold">{bookingCount}</div>
              </div>
              <div>
                <div className="text-gray-500">Services</div>
                <div className="font-semibold">{serviceCount}</div>
              </div>
              <div>
                <div className="text-gray-500">Engineers</div>
                <div className="font-semibold">{engineerCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base">Scheduling Engine</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{SCHEDULING_VERSION.label}</div>
            <div className="text-sm text-gray-600 mt-1">
              {SCHEDULING_VERSION.description}
            </div>
            <Badge variant="outline" className="mt-2 bg-purple-50 text-purple-700 border-0">
              {SCHEDULING_VERSION.features.length} features
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Enable or disable system features for gradual rollout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FeatureToggle
              label="V2 Scheduling Engine"
              description="Use the new multi-objective scheduling algorithm"
              defaultChecked={false}
            />
            <FeatureToggle
              label="Shadow Mode"
              description="Log V2 decisions for comparison without affecting allocations"
              defaultChecked={true}
            />
            <FeatureToggle
              label="Cluster Pricing"
              description="Apply discounts for clustered bookings"
              defaultChecked={true}
            />
            <FeatureToggle
              label="Real-time Optimization"
              description="Continuously optimize routes throughout the day"
              defaultChecked={false}
            />
            <FeatureToggle
              label="Customer LTV Scoring"
              description="Factor customer value into allocation decisions"
              defaultChecked={true}
            />
            <FeatureToggle
              label="Cancellation Prediction"
              description="Predict and mitigate cancellation risks"
              defaultChecked={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
          <CardDescription>System maintenance and data management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Export Data</div>
                  <div className="text-sm text-gray-500">
                    Download all system data as CSV
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Export All Data
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Recalculate Metrics</div>
                  <div className="text-sm text-gray-500">
                    Refresh all customer and area metrics
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Recalculate
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Clear Old Logs</div>
                  <div className="text-sm text-gray-500">
                    Remove allocation logs older than 90 days
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Clear Logs
              </Button>
            </div>

            <div className="p-4 border rounded-lg border-red-200 bg-red-50">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="font-medium text-red-900">Reset Demo Data</div>
                  <div className="text-sm text-red-700">
                    Clear all data and reseed with demo data
                  </div>
                </div>
              </div>
              <Button variant="destructive" size="sm">
                Reset Database
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version Info */}
      <Card>
        <CardHeader>
          <CardTitle>Version Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">App Version</div>
              <div className="font-mono">1.0.0</div>
            </div>
            <div>
              <div className="text-gray-500">Scheduling</div>
              <div className="font-mono">{SCHEDULING_VERSION.label}</div>
            </div>
            <div>
              <div className="text-gray-500">Next.js</div>
              <div className="font-mono">16.1.5</div>
            </div>
            <div>
              <div className="text-gray-500">Environment</div>
              <div className="font-mono">Production</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function FeatureToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
