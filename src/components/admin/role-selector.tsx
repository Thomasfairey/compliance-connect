"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/lib/actions";
import type { Role } from "@prisma/client";

interface RoleSelectorProps {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}

export function RoleSelector({
  userId,
  currentRole,
  disabled,
}: RoleSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: Role) {
    if (newRole === currentRole) return;

    setLoading(true);
    try {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        toast.success("Role updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentRole}
        onValueChange={(value) => handleRoleChange(value as Role)}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CUSTOMER">Customer</SelectItem>
          <SelectItem value="ENGINEER">Engineer</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
        </SelectContent>
      </Select>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
    </div>
  );
}
