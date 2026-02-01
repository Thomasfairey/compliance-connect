"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Bell, Moon, Globe, Shield, LogOut } from "lucide-react";
import Link from "next/link";

export default function EngineerSettingsPage() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link href="/engineer/profile">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Manage notification preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <Switch
                id="push-notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="job-reminders">Job Reminders</Label>
              <Switch id="job-reminders" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="new-jobs">New Job Alerts</Label>
              <Switch id="new-jobs" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Moon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Location</CardTitle>
                <CardDescription>Location sharing preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="location-sharing">Share Location During Jobs</Label>
                <p className="text-sm text-gray-500">Helps with accurate arrival times</p>
              </div>
              <Switch
                id="location-sharing"
                checked={locationSharing}
                onCheckedChange={setLocationSharing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Privacy & Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/sign-in">Change Password</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Download My Data
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <Button variant="destructive" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Version Info */}
        <div className="text-center text-sm text-gray-400 pt-4">
          <p>Compliance Connect v1.0.0</p>
          <p className="mt-1">
            <Link href="/help" className="underline">Help & Support</Link>
            {" · "}
            <Link href="#" className="underline">Privacy Policy</Link>
            {" · "}
            <Link href="#" className="underline">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
