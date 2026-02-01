"use client";

import { useState } from "react";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Save, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { Service } from "@prisma/client";

interface ServiceWithCount extends Service {
  _count: { bookings: number };
}

interface ServicesClientProps {
  services: ServiceWithCount[];
}

const serviceColors = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#EC4899", label: "Pink" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#6366F1", label: "Indigo" },
];

const emptyService: Partial<Service> = {
  name: "",
  slug: "",
  description: "",
  basePrice: 0,
  minCharge: 0,
  unitName: "unit",
  isActive: true,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function ServicesClient({ services: initialServices }: ServicesClientProps) {
  const [services, setServices] = useState(initialServices);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openNewService = () => {
    setEditingService({ ...emptyService });
    setIsNew(true);
  };

  const openEditService = (service: Service) => {
    setEditingService({ ...service });
    setIsNew(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const saveService = async () => {
    if (!editingService?.name || !editingService?.slug) {
      toast.error("Name and slug are required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/services", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingService),
      });

      if (!response.ok) throw new Error();

      const savedService = await response.json();

      if (isNew) {
        setServices((prev) => [...prev, { ...savedService, _count: { bookings: 0 } }]);
      } else {
        setServices((prev) =>
          prev.map((s) => (s.id === savedService.id ? { ...s, ...savedService } : s))
        );
      }

      toast.success(isNew ? "Service created" : "Service updated");
      setEditingService(null);
    } catch {
      toast.error("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service && service._count.bookings > 0) {
      toast.error("Cannot delete service with existing bookings");
      return;
    }

    setDeleting(serviceId);
    try {
      const response = await fetch(`/api/admin/services?id=${serviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      toast.success("Service deleted");
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (service: ServiceWithCount) => {
    try {
      const response = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, isActive: !service.isActive }),
      });

      if (!response.ok) throw new Error();

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s))
      );
      toast.success(`Service ${service.isActive ? "deactivated" : "activated"}`);
    } catch {
      toast.error("Failed to update service");
    }
  };

  return (
    <AdminPage
      title="Services"
      description="Manage compliance testing services and pricing"
      actions={
        <Button onClick={openNewService}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{services.length}</div>
            <div className="text-sm text-gray-500">Total Services</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {services.filter((s) => s.isActive).length}
            </div>
            <div className="text-sm text-gray-500">Active Services</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {services.reduce((sum, s) => sum + s._count.bookings, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(
                services.reduce((sum, s) => sum + s.basePrice, 0) / services.length || 0
              )}
            </div>
            <div className="text-sm text-gray-500">Avg. Base Price</div>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Min Charge</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: "#3B82F6" }}
                      />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">{service.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(service.basePrice)}/{service.unitName}
                  </TableCell>
                  <TableCell>{formatCurrency(service.minCharge)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {service._count.bookings}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={() => toggleActive(service)}
                      />
                      <Badge
                        variant="outline"
                        className={
                          service.isActive
                            ? "bg-green-50 text-green-700 border-0"
                            : "bg-gray-50 text-gray-500 border-0"
                        }
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditService(service)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteService(service.id)}
                        disabled={deleting === service.id || service._count.bookings > 0}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add New Service" : "Edit Service"}</DialogTitle>
            <DialogDescription>
              {isNew
                ? "Create a new compliance testing service"
                : "Update service details and pricing"}
            </DialogDescription>
          </DialogHeader>

          {editingService && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Service Name</Label>
                  <Input
                    value={editingService.name || ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEditingService({
                        ...editingService,
                        name,
                        slug: isNew ? generateSlug(name) : editingService.slug,
                      });
                    }}
                    placeholder="e.g., PAT Testing"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Slug</Label>
                  <Input
                    value={editingService.slug || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, slug: e.target.value })
                    }
                    placeholder="e.g., pat-testing"
                    disabled={!isNew}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used in URLs and API calls
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingService.description || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, description: e.target.value })
                    }
                    placeholder="Brief description of the service"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Base Price (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingService.basePrice || ""}
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
                    value={editingService.minCharge || ""}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        minCharge: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Pricing Unit</Label>
                  <Select
                    value={editingService.unitName || "unit"}
                    onValueChange={(value) =>
                      setEditingService({
                        ...editingService,
                        unitName: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Per Unit</SelectItem>
                      <SelectItem value="item">Per Item</SelectItem>
                      <SelectItem value="appliance">Per Appliance</SelectItem>
                      <SelectItem value="circuit">Per Circuit</SelectItem>
                      <SelectItem value="extinguisher">Per Extinguisher</SelectItem>
                      <SelectItem value="door">Per Door</SelectItem>
                      <SelectItem value="light">Per Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={editingService.isActive ?? true}
                    onCheckedChange={(checked) =>
                      setEditingService({ ...editingService, isActive: checked })
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>
              Cancel
            </Button>
            <Button onClick={saveService} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : isNew ? "Create Service" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
