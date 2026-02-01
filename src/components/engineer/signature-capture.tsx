"use client";

import { useState, useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, RotateCcw, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { uploadSignature } from "@/lib/actions/uploads";

type SignatureCaptureProps = {
  bookingId: string;
  onSignatureComplete?: (signatureUrl: string, signeeName: string) => void;
  existingSignatureUrl?: string;
  disabled?: boolean;
};

export function SignatureCapture({
  bookingId,
  onSignatureComplete,
  existingSignatureUrl,
  disabled = false,
}: SignatureCaptureProps) {
  const [open, setOpen] = useState(false);
  const [signeeName, setSigneeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
    setHasDrawn(false);
  }, []);

  const handleSave = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Please provide a signature");
      return;
    }

    if (!signeeName.trim()) {
      toast.error("Please enter the signer's name");
      return;
    }

    setSaving(true);
    try {
      const dataUrl = sigRef.current.toDataURL("image/png");

      const result = await uploadSignature(bookingId, dataUrl, signeeName.trim());

      if (result.success && result.url) {
        toast.success("Signature saved");
        onSignatureComplete?.(result.url, signeeName.trim());
        setOpen(false);
        handleClear();
        setSigneeName("");
      } else {
        toast.error(result.error || "Failed to save signature");
      }
    } catch (error) {
      console.error("Signature save error:", error);
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  if (existingSignatureUrl) {
    return (
      <div className="space-y-2">
        <Label>Customer Signature</Label>
        <div className="border rounded-lg p-4 bg-gray-50">
          <img
            src={existingSignatureUrl}
            alt="Customer signature"
            className="max-h-24 mx-auto"
          />
          <p className="text-center text-sm text-gray-500 mt-2">
            Signature captured
          </p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full"
          disabled={disabled}
        >
          <PenTool className="h-4 w-4 mr-2" />
          Capture Customer Signature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Signature</DialogTitle>
          <DialogDescription>
            Ask the customer to sign below to confirm job completion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signeeName">Signer&apos;s Name</Label>
            <Input
              id="signeeName"
              placeholder="Enter customer's full name"
              value={signeeName}
              onChange={(e) => setSigneeName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signature</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!hasDrawn}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  className: "w-full h-48 touch-none",
                  style: { width: "100%", height: "192px" },
                }}
                onBegin={() => setHasDrawn(true)}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Sign with finger or stylus
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasDrawn || !signeeName.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirm Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SignatureDisplayProps = {
  signatureUrl: string;
  signedBy?: string;
  signedAt?: Date;
};

export function SignatureDisplay({
  signatureUrl,
  signedBy,
  signedAt,
}: SignatureDisplayProps) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Customer Signature</p>
          {signedBy && (
            <p className="text-sm text-gray-500">{signedBy}</p>
          )}
          {signedAt && (
            <p className="text-xs text-gray-400">
              {new Date(signedAt).toLocaleString("en-GB")}
            </p>
          )}
        </div>
        <img
          src={signatureUrl}
          alt="Customer signature"
          className="max-h-16 border bg-white rounded"
        />
      </div>
    </div>
  );
}
