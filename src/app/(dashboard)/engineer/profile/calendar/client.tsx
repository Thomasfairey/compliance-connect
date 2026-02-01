"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CalendarSyncClientProps {
  provider: "google" | "outlook" | "ical";
  lastSyncedAt?: string;
  icalFeedUrl?: string;
}

export function CalendarSyncClient({
  provider,
  lastSyncedAt,
  icalFeedUrl,
}: CalendarSyncClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [icalEnabled, setIcalEnabled] = useState(true);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/engineer/calendar/${provider}/sync`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Calendar synced successfully");
        router.refresh();
      } else {
        toast.error("Failed to sync calendar");
      }
    } catch {
      toast.error("Failed to sync calendar");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch(`/api/engineer/calendar/${provider}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Calendar disconnected");
        router.refresh();
      } else {
        toast.error("Failed to disconnect calendar");
      }
    } catch {
      toast.error("Failed to disconnect calendar");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopy = async () => {
    if (!icalFeedUrl) return;

    try {
      await navigator.clipboard.writeText(icalFeedUrl);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  // iCal feed UI
  if (provider === "ical" && icalFeedUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ical-enabled">Enable iCal feed</Label>
          <Switch
            id="ical-enabled"
            checked={icalEnabled}
            onCheckedChange={setIcalEnabled}
          />
        </div>

        {icalEnabled && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={icalFeedUrl}
                  readOnly
                  className="flex-1 text-xs bg-white border rounded px-2 py-1.5 font-mono truncate"
                />
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Copy this URL and add it to your calendar app as a subscription.
              </p>
            </div>

            <a
              href={`webcal://${icalFeedUrl.replace("https://", "").replace("http://", "")}`}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Calendar App
            </a>
          </>
        )}
      </div>
    );
  }

  // Connected calendar UI (Google/Outlook)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Last sync</span>
        <span className="text-gray-500">
          {lastSyncedAt
            ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
            : "Never"}
        </span>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Sync Now
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Disconnect"
          )}
        </Button>
      </div>
    </div>
  );
}
