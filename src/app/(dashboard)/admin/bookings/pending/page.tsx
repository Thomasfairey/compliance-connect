import { redirect } from "next/navigation";

export default function PendingBookingsPage() {
  redirect("/admin/scheduling/calendar?filter=unallocated");
}
