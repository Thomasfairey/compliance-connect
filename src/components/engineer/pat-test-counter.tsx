"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Calculator, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logPATTestCount } from "@/lib/actions/compensation";

type PATTestCounterProps = {
  bookingId: string;
  estimatedQty: number;
  ratePerTest?: number;
  onLogged?: (earnings: number) => void;
};

export function PATTestCounter({
  bookingId,
  estimatedQty,
  ratePerTest = 0.45,
  onLogged,
}: PATTestCounterProps) {
  const [open, setOpen] = useState(false);
  const [itemsTested, setItemsTested] = useState<number>(estimatedQty);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [logged, setLogged] = useState(false);

  const calculatedEarnings = itemsTested * ratePerTest;

  const handleSubmit = async () => {
    if (itemsTested <= 0) {
      toast.error("Please enter a valid number of items tested");
      return;
    }

    setLoading(true);
    try {
      const result = await logPATTestCount(bookingId, itemsTested, notes || undefined);

      if (result.success) {
        toast.success(`PAT test count logged! Earnings: £${result.earnings?.toFixed(2)}`);
        setLogged(true);
        setOpen(false);
        onLogged?.(result.earnings ?? 0);
      } else {
        toast.error(result.error || "Failed to log PAT test count");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (logged) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <span className="text-green-800 font-medium">
          PAT test count logged: {itemsTested} items (£{calculatedEarnings.toFixed(2)})
        </span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Calculator className="h-4 w-4 mr-2" />
          Log PAT Test Count
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log PAT Test Count</DialogTitle>
          <DialogDescription>
            Enter the actual number of items tested to calculate your earnings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="itemsTested">Items Tested</Label>
            <Input
              id="itemsTested"
              type="number"
              min="1"
              value={itemsTested}
              onChange={(e) => setItemsTested(parseInt(e.target.value) || 0)}
              className="h-12 text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated: {estimatedQty} items
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about the testing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Earnings Preview */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Rate per test</span>
              <span className="font-medium">£{ratePerTest.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Items tested</span>
              <span className="font-medium">{itemsTested}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-green-200">
              <span className="font-medium text-green-800">Your Earnings</span>
              <span className="text-xl font-bold text-green-700">
                £{calculatedEarnings.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || itemsTested <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm & Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
