import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getServices } from "@/lib/actions";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Manage Services",
};

export default async function AdminServicesPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const services = await getServices();

  return (
    <div>
      <PageHeader
        title="Services"
        description="View available compliance testing services."
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Min Charge</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-500 max-w-xs truncate">
                          {service.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {service.slug}
                    </TableCell>
                    <TableCell>
                      {formatPrice(service.basePrice)}/{service.unitName}
                    </TableCell>
                    <TableCell>{formatPrice(service.minCharge)}</TableCell>
                    <TableCell className="capitalize">{service.unitName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          service.isActive
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
