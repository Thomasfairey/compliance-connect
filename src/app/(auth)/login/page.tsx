"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(error ? "Invalid credentials" : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError("Invalid email or password");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setLoginError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const loginAs = async (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setIsLoading(true);
    setLoginError(null);

    const result = await signIn("credentials", {
      email: testEmail,
      password: testPassword,
      redirect: false,
    });

    if (result?.error) {
      setLoginError("Test account not found. Run the seed script first.");
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo size={40} />
            <span className="text-2xl font-bold text-gray-900">Compliance Connect</span>
          </div>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-center text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Demo Accounts */}
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Demo Accounts</CardTitle>
            <CardDescription className="text-xs text-blue-600">
              Click to login instantly as different user types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-left border-blue-200 hover:bg-blue-100"
              onClick={() => loginAs("admin@demo.com", "demo123")}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Admin</span>
                <span className="text-xs text-gray-500">admin@demo.com</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left border-green-200 hover:bg-green-100"
              onClick={() => loginAs("customer@demo.com", "demo123")}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Customer</span>
                <span className="text-xs text-gray-500">customer@demo.com</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left border-orange-200 hover:bg-orange-100"
              onClick={() => loginAs("engineer@demo.com", "demo123")}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Engineer</span>
                <span className="text-xs text-gray-500">engineer@demo.com</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
