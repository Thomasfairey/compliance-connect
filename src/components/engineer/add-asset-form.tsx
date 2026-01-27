"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { assetSchema, type AssetFormData } from "@/lib/validations";
import { createAsset } from "@/lib/actions";

interface AddAssetFormProps {
  bookingId: string;
  unitName: string;
}

export function AddAssetForm({ bookingId, unitName }: AddAssetFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const statusOptions = [
    { value: "PASS", label: "Pass", icon: CheckCircle2, color: "green" },
    { value: "FAIL", label: "Fail", icon: XCircle, color: "red" },
    { value: "N/A", label: "N/A", icon: MinusCircle, color: "gray" },
  ] as const;

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full h-14 border-dashed"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Test Result
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-gray-200 bg-gray-50"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{unitName} Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kettle" {...field} />
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
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Tag (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., PAT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Result *</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                        field.value === option.value
                          ? option.color === "green"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : option.color === "red"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-gray-500 bg-gray-100 text-gray-700"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <option.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
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
                    placeholder="Any issues or observations..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                form.reset();
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
    </motion.div>
  );
}
