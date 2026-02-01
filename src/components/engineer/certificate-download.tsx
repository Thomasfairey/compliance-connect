"use client";

import { useState } from "react";
import { FileText, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  generateCompletionCertificate,
  regenerateCertificate,
} from "@/lib/actions/certificates";

type CertificateDownloadProps = {
  bookingId: string;
  certificateUrl?: string | null;
  canRegenerate?: boolean;
};

export function CertificateDownload({
  bookingId,
  certificateUrl,
  canRegenerate = false,
}: CertificateDownloadProps) {
  const [generating, setGenerating] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(certificateUrl);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateCompletionCertificate(bookingId);
      if (result.success && result.url) {
        setCurrentUrl(result.url);
        toast.success("Certificate generated");
      } else {
        toast.error(result.error || "Failed to generate certificate");
      }
    } catch {
      toast.error("Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const result = await regenerateCertificate(bookingId);
      if (result.success && result.url) {
        setCurrentUrl(result.url);
        toast.success("Certificate regenerated");
      } else {
        toast.error(result.error || "Failed to regenerate certificate");
      }
    } catch {
      toast.error("Failed to regenerate certificate");
    } finally {
      setGenerating(false);
    }
  };

  if (currentUrl) {
    return (
      <div className="space-y-2">
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
        </a>
        {canRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-500"
            onClick={handleRegenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      className="w-full"
      variant="outline"
      onClick={handleGenerate}
      disabled={generating}
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Generate Certificate
        </>
      )}
    </Button>
  );
}
