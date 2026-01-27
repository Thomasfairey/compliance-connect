"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function LoadingSpinner({
  size = "md",
  text,
  className,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-gray-500", sizeClasses[size])} />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </div>
  );
}

export function PageLoading() {
  return (
    <motion.div
      className="flex items-center justify-center min-h-[400px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <LoadingSpinner size="lg" text="Loading..." />
    </motion.div>
  );
}
