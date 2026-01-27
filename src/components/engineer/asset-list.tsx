"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Trash2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";
import { deleteAsset } from "@/lib/actions";
import type { Asset } from "@prisma/client";

interface AssetListProps {
  assets: Asset[];
  canEdit: boolean;
}

export function AssetList({ assets, canEdit }: AssetListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(assetId: string) {
    setDeletingId(assetId);
    try {
      const result = await deleteAsset(assetId);
      if (result.success) {
        toast.success("Asset removed");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to remove asset");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeletingId(null);
    }
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No test results recorded yet</p>
      </div>
    );
  }

  const passCount = assets.filter((a) => a.status === "PASS").length;
  const failCount = assets.filter((a) => a.status === "FAIL").length;
  const naCount = assets.filter((a) => a.status === "N/A").length;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-green-50 rounded-xl text-center">
          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-semibold text-green-700">{passCount}</p>
          <p className="text-xs text-green-600">Passed</p>
        </div>
        <div className="p-3 bg-red-50 rounded-xl text-center">
          <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
          <p className="text-lg font-semibold text-red-700">{failCount}</p>
          <p className="text-xs text-red-600">Failed</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl text-center">
          <MinusCircle className="h-5 w-5 text-gray-600 mx-auto mb-1" />
          <p className="text-lg font-semibold text-gray-700">{naCount}</p>
          <p className="text-xs text-gray-600">N/A</p>
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        <AnimatePresence>
          {assets.map((asset) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">
                    {asset.name}
                  </p>
                  <StatusBadge status={asset.status} />
                </div>
                <p className="text-sm text-gray-500 truncate">{asset.location}</p>
                {asset.assetTag && (
                  <p className="text-xs text-gray-400">Tag: {asset.assetTag}</p>
                )}
                {asset.notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {asset.notes}
                  </p>
                )}
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(asset.id)}
                  disabled={deletingId === asset.id}
                  className="text-gray-400 hover:text-red-600"
                >
                  {deletingId === asset.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
