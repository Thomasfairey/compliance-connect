import Link from "next/link";
import { getUserSites } from "@/lib/actions";
import { PageHeader, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, MapPin, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sites",
};

export default async function SitesPage() {
  const sites = await getUserSites();

  return (
    <div>
      <PageHeader
        title="Sites"
        description="Manage your testing locations."
        action={
          <Link href="/sites/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </Link>
        }
      />

      {sites.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No sites yet"
          description="Add your first site to start booking compliance tests."
          actionLabel="Add Site"
          actionHref="/sites/new"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Link key={site.id} href={`/sites/${site.id}`}>
              <Card className="h-full hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-gray-600" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {site.name}
                  </h3>
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{site.address}</p>
                      <p>{site.postcode}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
