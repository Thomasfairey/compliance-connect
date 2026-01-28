import { redirect } from "next/navigation";
import { getOrCreateEngineerProfile, getAvailableServices } from "@/lib/actions/engineer";
import { EngineerOnboardingWizard } from "@/components/engineer/onboarding-wizard";

export const metadata = {
  title: "Engineer Onboarding",
};

export default async function EngineerOnboardingPage() {
  const profile = await getOrCreateEngineerProfile();
  const services = await getAvailableServices();

  if (!profile) {
    redirect("/sign-in");
  }

  // If profile is already approved, redirect to engineer dashboard
  if (profile.status === "APPROVED") {
    redirect("/engineer");
  }

  return (
    <div className="min-h-screen bg-background">
      <EngineerOnboardingWizard
        profile={profile}
        services={services}
      />
    </div>
  );
}
