import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getBundles, getRecommendedBundles } from "@/lib/actions/bundles";
import { db } from "@/lib/db";
import { BundleBookingWizard } from "./bundle-booking-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Bundle",
};

export default async function BundlesPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string }>;
}) {
  const user = await getOrCreateUser();
  const params = await searchParams;

  // Get user's sites
  const sites = await db.site.findMany({
    where: { userId: user.id },
    include: { profile: true },
    orderBy: { name: "asc" },
  });

  if (sites.length === 0) {
    redirect("/sites/new?returnTo=/bookings/bundles");
  }

  // Get all bundles
  const allBundles = await getBundles();

  // Get recommended bundles if a site is selected
  let recommendedBundles = allBundles;
  const selectedSiteId = params.siteId || sites[0]?.id;

  if (selectedSiteId) {
    recommendedBundles = await getRecommendedBundles(selectedSiteId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Bundles</h1>
        <p className="text-gray-500">
          Save up to 25% by booking multiple compliance services together.
        </p>
      </div>

      <BundleBookingWizard
        sites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          postcode: s.postcode,
          hasProfile: !!s.profile?.questionnaireComplete,
        }))}
        allBundles={allBundles}
        recommendedBundles={recommendedBundles}
        initialSiteId={selectedSiteId}
      />
    </div>
  );
}
