import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Compliance Connect",
    template: "%s | Compliance Connect",
  },
  description:
    "Book compliance testing services for your business. PAT testing, fire alarm testing, emergency lighting, and more.",
  keywords: [
    "PAT testing",
    "fire alarm testing",
    "compliance",
    "electrical testing",
    "safety testing",
  ],
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </SessionProvider>
      </body>
    </html>
  );
}
