import { Metadata, Viewport } from "next";
import { PWAProvider } from "@/components/engineer/pwa-provider";

export const metadata: Metadata = {
  title: {
    default: "Engineer | Compliance Connect",
    template: "%s | Engineer",
  },
  description: "Compliance on Demand engineer mobile app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "COD Engineer",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
  viewportFit: "cover",
};

export default function EngineerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PWAProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </PWAProvider>
  );
}
