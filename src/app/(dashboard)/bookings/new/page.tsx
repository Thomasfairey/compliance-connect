import { getServices, getUserSites } from "@/lib/actions";
import { db } from "@/lib/db";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { BookingTypeSelector } from "@/components/booking/booking-type-selector";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Booking",
};

interface NewBookingPageProps {
  searchParams: Promise<{ siteId?: string; bookingType?: string }>;
}

export default async function NewBookingPage({ searchParams }: NewBookingPageProps) {
  const { siteId, bookingType } = await searchParams;

  // If no booking type selected, show the type selector
  if (!bookingType) {
    // Get max bundle discount for display
    const bundles = await db.serviceBundle.findMany({
      where: { isActive: true },
      select: { discountPercent: true },
    });
    const maxDiscount = bundles.length > 0
      ? Math.max(...bundles.map((b) => b.discountPercent))
      : 25;

    return <BookingTypeSelector siteId={siteId} maxBundleDiscount={maxDiscount} />;
  }

  // Otherwise show the booking wizard
  const [services, sites] = await Promise.all([
    getServices(),
    getUserSites(),
  ]);

  return <BookingWizard services={services} sites={sites} initialSiteId={siteId} />;
}
