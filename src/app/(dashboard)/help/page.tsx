import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Phone,
  Mail,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Help & Support | Compliance Connect",
  description: "Get help with Compliance Connect",
};

const faqItems = [
  {
    question: "How do I update my availability?",
    answer: "Go to Profile > Calendar Sync to manage your availability and connect your calendar.",
  },
  {
    question: "What if I need to cancel a job?",
    answer: "Contact the admin team as soon as possible. Cancellations affect your reliability score.",
  },
  {
    question: "How do I get paid?",
    answer: "Earnings are calculated weekly and paid monthly. View your earnings in the Earnings tab.",
  },
  {
    question: "How do I update my qualifications?",
    answer: "Go to Profile > Edit to update your qualifications and upload new certificates.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold">Help & Support</h1>
          <p className="text-gray-600 mt-1">We&apos;re here to help you succeed</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Contact Options */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium">Call Us</p>
              <p className="text-xs text-gray-500 mt-1">0800 123 4567</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-gray-500 mt-1">support@cod.uk</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium">Chat</p>
              <p className="text-xs text-gray-500 mt-1">Live support</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                <h3 className="font-medium text-sm">{item.question}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-between" asChild>
              <Link href="#">
                Engineer Handbook
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <Link href="#">
                Safety Guidelines
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <Link href="#">
                Video Tutorials
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Emergency Support */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-red-800">Emergency Support</h3>
            <p className="text-sm text-red-700 mt-1">
              For urgent issues during a job, call our emergency line:
            </p>
            <Button variant="destructive" className="mt-3 w-full" asChild>
              <a href="tel:08001234567">
                <Phone className="h-4 w-4 mr-2" />
                Emergency: 0800 123 4567
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
