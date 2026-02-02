"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function RunOptimizationButton() {
  const router = useRouter();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [, startTransition] = useTransition();

  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/admin/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Optimized ${data.optimizedCount} routes, saving ~${data.totalKmSaved} km`,
          {
            icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          }
        );
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data.error || "Optimization failed");
      }
    } catch {
      toast.error("Failed to run optimization");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Button onClick={runOptimization} disabled={isOptimizing}>
      {isOptimizing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Optimizing...
        </>
      ) : (
        <>
          <Zap className="w-4 h-4 mr-2" />
          Run Optimization
        </>
      )}
    </Button>
  );
}

export function ReoptimizeButton({ engineerId, date }: { engineerId: string; date: Date }) {
  const router = useRouter();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [, startTransition] = useTransition();

  const reoptimize = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/admin/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engineerId, date: date.toISOString() }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Route re-optimized");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(data.error || "Re-optimization failed");
      }
    } catch {
      toast.error("Failed to re-optimize");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={reoptimize} disabled={isOptimizing}>
      {isOptimizing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-1" />
          Re-optimize
        </>
      )}
    </Button>
  );
}
