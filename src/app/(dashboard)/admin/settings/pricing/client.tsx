"use client";

import { useState } from "react";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Plus, Edit2, PoundSterling, Percent, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Service, PricingRule } from "@prisma/client";

interface PricingSettingsClientProps {
  services: Service[];
  pricingRules: PricingRule[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function PricingSettingsClient({
  services,
  pricingRules,
}: PricingSettingsClientProps) {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [rules, setRules] = useState(pricingRules);
  const [saving, setSaving] = useState(false);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/admin/pricing-rules/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, enabled }),
      });

      if (!response.ok) throw new Error();

      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
      );
      toast.success(`Rule ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update rule");
    }
  };

  const saveServicePrice = async () => {
    if (!editingService) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/services/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: editingService.id,
          basePrice: editingService.basePrice,
          minCharge: editingService.minCharge,
        }),
      });

      if (!response.ok) throw new Error();

      toast.success("Service price updated");
      setEditingService(null);
    } catch {
      toast.error("Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Pricing Settings"
      description="Configure service prices and dynamic pricing rules"
    >
      <div className="space-y-8">
        {/* Service Base Prices */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <PoundSterling className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Service Base Prices</CardTitle>
                <CardDescription>
                  Set the base price for each service type
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Min Charge</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">{service.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(service.basePrice)}</TableCell>
                    <TableCell>{formatCurrency(service.minCharge)}</TableCell>
                    <TableCell className="text-gray-500">
                      per {service.unitName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingService(service)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dynamic Pricing Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Percent className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Dynamic Pricing Rules</CardTitle>
                  <CardDescription>
                    Automatic discounts and premiums based on conditions
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            rule.type === "cluster" || rule.type === "flex" || rule.type === "loyalty"
                              ? "bg-green-50 text-green-700 border-0"
                              : rule.type === "urgency"
                              ? "bg-amber-50 text-amber-700 border-0"
                              : "bg-blue-50 text-blue-700 border-0"
                          }
                        >
                          {rule.type === "urgency" ? "Premium" : "Discount"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {rule.description || getDefaultDescription(rule.type)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {getRuleAmount(rule)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Priority: {rule.priority}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tips */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Pricing Tips</h4>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Cluster discounts incentivize customers to book when engineers are nearby</li>
                  <li>• Urgency premiums cover the cost of schedule disruption for last-minute bookings</li>
                  <li>• Loyalty discounts increase customer retention and lifetime value</li>
                  <li>• Off-peak discounts help balance workload across the week</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Price</DialogTitle>
            <DialogDescription>
              Update the pricing for {editingService?.name}
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Base Price (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingService.basePrice}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Minimum Charge (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingService.minCharge}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      minCharge: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>
              Cancel
            </Button>
            <Button onClick={saveServicePrice} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function getDefaultDescription(type: string): string {
  switch (type) {
    case "cluster":
      return "Discount when engineer already has jobs nearby";
    case "urgency":
      return "Premium for last-minute bookings";
    case "offpeak":
      return "Discount for slower days of the week";
    case "flex":
      return "Discount for flexible scheduling";
    case "loyalty":
      return "Discount for repeat customers";
    default:
      return "";
  }
}

function getRuleAmount(rule: PricingRule): string {
  const config = rule.config as any;
  if (config?.cluster?.discountPercent) return `${config.cluster.discountPercent}% off`;
  if (config?.urgency?.premiumPercent) return `+${config.urgency.premiumPercent}%`;
  if (config?.offpeak?.discountPercent) return `${config.offpeak.discountPercent}% off`;
  if (config?.flex?.discountPercent) return `${config.flex.discountPercent}% off`;
  if (config?.loyalty?.discountPercent) return `${config.loyalty.discountPercent}% off`;
  return "-";
}
