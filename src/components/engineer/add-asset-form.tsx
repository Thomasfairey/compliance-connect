"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Check, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { assetSchema, type AssetFormData } from "@/lib/validations";
import { createAsset } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface AddAssetFormProps {
  bookingId: string;
  unitName: string;
}

type AssetStatus = "PASS" | "FAIL" | "N/A";

export function AddAssetForm({ bookingId, unitName }: AddAssetFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      location: "",
      status: "PASS",
      assetTag: "",
      notes: "",
    },
  });

  async function onSubmit(data: AssetFormData) {
    setLoading(true);
    try {
      const result = await createAsset(bookingId, data);
      if (result.success) {
        toast.success("Test result added");
        form.reset();
        setIsExpanded(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add test result");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const statusOptions: { value: AssetStatus; label: string; icon: typeof Check; color: string }[] = [
    { value: "PASS", label: "Pass", icon: Check, color: "bg-green-100 text-green-700 border-green-300" },
    { value: "FAIL", label: "Fail", icon: X, color: "bg-red-100 text-red-700 border-red-300" },
    { value: "N/A", label: "N/A", icon: Minus, color: "bg-gray-100 text-gray-700 border-gray-300" },
  ];

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className="w-full border-dashed h-12"
        onClick={() => setIsExpanded(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Test Result
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{unitName} Name / ID *</FormLabel>
                  <FormControl>
                    <Input placeholder={`e.g., Kettle #1`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kitchen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Result *</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = field.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                          isSelected
                            ? option.color + " border-current"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Tag (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., PAT-2024-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any observations or issues..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setIsExpanded(false);
              }}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Result
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
