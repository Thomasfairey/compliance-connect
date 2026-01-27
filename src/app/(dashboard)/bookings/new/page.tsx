import { getServices, getUserSites } from "@/lib/actions";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata = {
  title: "New Booking",
};

export default async function NewBookingPage() {
  const [services, sites] = await Promise.all([
    getServices(),
    getUserSites(),
  ]);

  return <BookingWizard services={services} sites={sites} />;
}
