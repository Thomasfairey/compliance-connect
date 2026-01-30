import { redirect, notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteQuestionnaire } from "@/components/site/site-questionnaire";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Site Questionnaire",
};

export default async function SiteQuestionnairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const site = await db.site.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!site) {
    notFound();
  }

  if (site.userId !== user.id) {
    redirect("/sites");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SiteQuestionnaire
        siteId={site.id}
        siteName={site.name}
        initialData={site.profile ? {
          buildingType: site.profile.buildingType,
          industryType: site.profile.industryType,
          floorArea: site.profile.floorArea ?? undefined,
          numberOfFloors: site.profile.numberOfFloors ?? undefined,
          numberOfRooms: site.profile.numberOfRooms ?? undefined,
          hasCommercialKitchen: site.profile.hasCommercialKitchen,
          hasServerRoom: site.profile.hasServerRoom,
          hasWorkshop: site.profile.hasWorkshop,
          hasPublicAccess: site.profile.hasPublicAccess,
          yearBuilt: site.profile.yearBuilt ?? undefined,
          lastRefurbishment: site.profile.lastRefurbishment ?? undefined,
          typicalOccupancy: site.profile.typicalOccupancy ?? undefined,
          numberOfWorkstations: site.profile.numberOfWorkstations ?? undefined,
        } : undefined}
      />
    </div>
  );
}
