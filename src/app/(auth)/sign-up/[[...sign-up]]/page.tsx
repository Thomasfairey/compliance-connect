import { SignUp } from "@clerk/nextjs";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Custom Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">OfficeTest On Demand</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-1">Get started with compliance testing today</p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-xl border border-gray-100 rounded-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton:
                "border border-gray-200 hover:bg-gray-50 transition-colors rounded-xl",
              formButtonPrimary:
                "bg-black hover:bg-gray-800 text-white transition-colors rounded-xl h-12",
              footerActionLink: "text-black hover:text-gray-600",
              formFieldInput: "rounded-xl",
            },
          }}
          fallbackRedirectUrl="/dashboard"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
