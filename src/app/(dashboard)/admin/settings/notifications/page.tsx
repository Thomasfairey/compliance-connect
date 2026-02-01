import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Mail, MessageSquare, Bell, Send } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notification Settings | Admin",
  description: "Configure email, SMS, and push notifications",
};

const notificationTriggers = [
  {
    id: "booking_created",
    label: "Booking Created",
    description: "When a new booking is placed",
    email: true,
    sms: false,
    push: true,
    recipients: ["customer", "admin"],
  },
  {
    id: "booking_confirmed",
    label: "Booking Confirmed",
    description: "When an engineer is assigned",
    email: true,
    sms: true,
    push: true,
    recipients: ["customer", "engineer"],
  },
  {
    id: "booking_reminder",
    label: "Booking Reminder",
    description: "24 hours before scheduled date",
    email: true,
    sms: true,
    push: true,
    recipients: ["customer", "engineer"],
  },
  {
    id: "engineer_en_route",
    label: "Engineer En Route",
    description: "When engineer starts traveling",
    email: false,
    sms: true,
    push: true,
    recipients: ["customer"],
  },
  {
    id: "booking_completed",
    label: "Booking Completed",
    description: "When job is marked complete",
    email: true,
    sms: false,
    push: true,
    recipients: ["customer"],
  },
  {
    id: "certificate_ready",
    label: "Certificate Ready",
    description: "When compliance certificate is uploaded",
    email: true,
    sms: false,
    push: true,
    recipients: ["customer"],
  },
  {
    id: "compliance_expiring",
    label: "Compliance Expiring",
    description: "30, 14, and 7 days before expiry",
    email: true,
    sms: false,
    push: false,
    recipients: ["customer"],
  },
];

export default async function NotificationsPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminPage
      title="Notification Settings"
      description="Configure when and how notifications are sent"
      actions={
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      }
    >
      {/* Channel Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Email</CardTitle>
                <CardDescription>Transactional emails</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch defaultChecked />
              </div>
              <div>
                <Label className="text-sm text-gray-500">From Address</Label>
                <Input defaultValue="notifications@officetest.co.uk" className="mt-1" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-0">
                Connected via Resend
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">SMS</CardTitle>
                <CardDescription>Text message alerts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch defaultChecked />
              </div>
              <div>
                <Label className="text-sm text-gray-500">From Number</Label>
                <Input defaultValue="+44 7XXX XXXXXX" className="mt-1" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-0">
                Connected via Twilio
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Push</CardTitle>
                <CardDescription>In-app notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch defaultChecked />
              </div>
              <div className="text-sm text-gray-500">
                Push notifications are delivered to the engineer mobile app and customer portal.
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-0">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>
            Configure which events trigger notifications and through which channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationTriggers.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{trigger.label}</div>
                  <div className="text-sm text-gray-500">{trigger.description}</div>
                  <div className="flex gap-1 mt-2">
                    {trigger.recipients.map((r) => (
                      <Badge key={r} variant="outline" className="text-xs capitalize">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <Switch defaultChecked={trigger.email} />
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <Switch defaultChecked={trigger.sms} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <Switch defaultChecked={trigger.push} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Send Test Notification</h4>
              <p className="text-sm text-gray-500">
                Send a test notification to verify your configuration
              </p>
            </div>
            <Button variant="outline">
              <Send className="w-4 h-4 mr-2" />
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
