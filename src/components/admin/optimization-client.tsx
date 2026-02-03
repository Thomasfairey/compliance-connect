"use client";

import { CheckCircle2 } from "lucide-react";

export function SystemHealthStatus() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
      <CheckCircle2 className="w-4 h-4" />
      <span>Auto-optimization active</span>
    </div>
  );
}
