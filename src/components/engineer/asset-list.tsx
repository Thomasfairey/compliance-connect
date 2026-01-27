"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
        toast.error(result.error || "Failed to delete asset");
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
        <p>No test results recorded yet.</p>
        {canEdit && (
          <p className="text-sm mt-1">Add items above as you test them.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <p className="font-medium text-gray-900 truncate">{asset.name}</p>
              <StatusBadge status={asset.status} />
            </div>
            <p className="text-sm text-gray-500">{asset.location}</p>
            {asset.assetTag && (
              <p className="text-xs text-gray-400 mt-1">Tag: {asset.assetTag}</p>
            )}
            {asset.notes && (
              <p className="text-sm text-gray-600 mt-2">{asset.notes}</p>
            )}
          </div>

          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                  disabled={deletingId === asset.id}
                >
                  {deletingId === asset.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Test Result</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this test result? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(asset.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Items Tested</span>
          <span className="font-semibold">{assets.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-500">Passed</span>
          <span className="font-semibold text-green-600">
            {assets.filter((a) => a.status === "PASS").length}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-500">Failed</span>
          <span className="font-semibold text-red-600">
            {assets.filter((a) => a.status === "FAIL").length}
          </span>
        </div>
      </div>
    </div>
  );
}
