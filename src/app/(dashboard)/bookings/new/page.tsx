import { getServices, getUserSites } from "@/lib/actions";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata = {
  title: "New Booking",
};

interface NewBookingPageProps {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function NewBookingPage({ searchParams }: NewBookingPageProps) {
  const { siteId } = await searchParams;
  const [services, sites] = await Promise.all([
    getServices(),
    getUserSites(),
  ]);

  return <BookingWizard services={services} sites={sites} initialSiteId={siteId} />;
}
