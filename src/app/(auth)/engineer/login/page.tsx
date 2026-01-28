"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Wrench, Shield, Calendar, Award } from "lucide-react";

export default function EngineerLoginPage() {
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
              <span className="text-xl font-bold">Compliance Connect</span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Engineer Portal
              </h1>
              <p className="text-lg text-white/70">
                Access your jobs, manage your availability, and grow your business with Compliance Connect.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Flexible Scheduling</p>
                  <p className="text-sm text-white/60">Set your availability and sync with your calendar</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Quality Jobs</p>
                  <p className="text-sm text-white/60">Get matched with jobs that fit your skills and location</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Build Your Reputation</p>
                  <p className="text-sm text-white/60">Showcase your qualifications and certifications</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/50">
            Trusted by 500+ compliance engineers across the UK
          </p>
        </div>
      </div>

      {/* Right Side - Sign In */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 bg-background">
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Compliance Connect</span>
          </Link>
        </div>

        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Wrench className="w-4 h-4" />
              Engineer Access
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Sign in to your account
            </h2>
            <p className="text-muted-foreground mt-2">
              Welcome back! Enter your credentials to access your engineer dashboard.
            </p>
          </div>

          <SignIn
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
                identifierPreviewText: "text-foreground",
                identifierPreviewEditButton: "text-primary",
              },
            }}
            afterSignInUrl="/engineer/onboarding"
            signUpUrl="/engineer/signup"
          />

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Not an engineer?{" "}
              <Link href="/sign-in" className="text-primary hover:underline font-medium">
                Customer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
