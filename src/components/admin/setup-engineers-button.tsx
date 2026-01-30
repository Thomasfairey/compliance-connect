"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setupAllEngineersForAutoAllocation } from "@/lib/actions";
import { Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export function SetupEngineersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const router = useRouter();

  const handleSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await setupAllEngineersForAutoAllocation();
      setResult(res);
      if (res.success) {
        router.refresh();
      }
    } catch (error) {
      setResult({ success: false, error: "Failed to setup engineers" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button onClick={handleSetup} disabled={loading} variant="outline">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Setting up...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Setup All Engineers for Auto-Allocation
          </>
        )}
      </Button>
      {result && (
        <span className={result.success ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
          {result.success
            ? `${result.count} engineer(s) configured for auto-allocation`
            : result.error
          }
        </span>
      )}
    </div>
  );
}
