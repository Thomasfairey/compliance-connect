"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Shield, Award, CheckCircle2 } from "lucide-react";

export default function EngineerSignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 noise" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">OfficeTest On Demand</span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Join Our Network
              </h1>
              <p className="text-lg text-white/70">
                Become a OfficeTest On Demand engineer and access a steady stream of quality compliance jobs.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Set your own availability and rates</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Get matched with jobs in your area</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>No subscription fees - only pay when you work</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Weekly payouts directly to your account</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>Build your professional profile</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center text-xl font-bold">
                  JM
                </div>
                <div>
                  <p className="font-medium">James Mitchell</p>
                  <p className="text-sm text-white/60">PAT Testing Specialist, London</p>
                </div>
              </div>
              <p className="text-white/80 italic">
                &ldquo;Since joining OfficeTest On Demand, I&apos;ve been able to grow my business by 40%. The platform makes it easy to manage my schedule and find quality jobs.&rdquo;
              </p>
            </div>
          </div>

          <p className="text-sm text-white/50">
            Average engineer earns £800-1,200 per week
          </p>
        </div>
      </div>

      {/* Right Side - Sign Up */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 bg-background overflow-y-auto py-12">
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">OfficeTest On Demand</span>
          </Link>
        </div>

        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-sm font-medium mb-4">
              <Award className="w-4 h-4" />
              Become an Engineer
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Create your account
            </h2>
            <p className="text-muted-foreground mt-2">
              Start your journey as a OfficeTest On Demand engineer. After signup, you&apos;ll complete your profile and await approval.
            </p>
          </div>

          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 p-0 bg-transparent",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-border hover:bg-muted transition-colors rounded-xl",
                socialButtonsBlockButtonText: "font-medium",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground",
                formFieldLabel: "text-foreground font-medium",
                formFieldInput:
                  "rounded-xl border-border focus:ring-2 focus:ring-primary focus:border-primary",
                formButtonPrimary:
                  "gradient-primary hover:opacity-90 text-white transition-all rounded-xl h-12 font-semibold",
                footerActionLink: "text-primary hover:text-primary/80 font-medium",
              },
            }}
            afterSignUpUrl="/engineer/onboarding"
            signInUrl="/engineer/login"
          />

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/engineer/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Looking to book services?{" "}
              <Link href="/sign-up" className="text-primary hover:underline font-medium">
                Customer signup
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
