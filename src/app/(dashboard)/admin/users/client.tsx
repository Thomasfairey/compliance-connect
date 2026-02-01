"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Search, UserPlus, Edit2, MoreVertical, Shield, Key, Ban, Check } from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ENGINEER" | "ADMIN";
  status: "active" | "pending" | "suspended";
  lastActive: Date;
  createdAt: Date;
  hasEngineerProfile: boolean;
}

interface UsersClientProps {
  users: User[];
  currentUserId: string;
}

export function UsersClient({ users, currentUserId }: UsersClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) throw new Error();
      toast.success("Role updated successfully");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    engineers: users.filter((u) => u.role === "ENGINEER").length,
    customers: users.filter((u) => u.role === "CUSTOMER").length,
    pending: users.filter((u) => u.status === "pending").length,
  };

  return (
    <AdminPage
      title="Users & Access"
      description="Manage user accounts and permissions"
      actions={
        <Link href="/admin/users/roles">
          <Button variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            Manage Roles
          </Button>
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Users</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.admins}</div>
          <div className="text-sm text-gray-500">Admins</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.engineers}</div>
          <div className="text-sm text-gray-500">Engineers</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold">{stats.customers}</div>
          <div className="text-sm text-gray-500">Customers</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending Approval</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="ENGINEER">Engineer</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.name || "Unnamed"}
                          {user.id === currentUserId && (
                            <span className="ml-2 text-xs text-gray-400">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(user.lastActive), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Key className="w-4 h-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === "active" ? (
                          <DropdownMenuItem className="text-red-600">
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend User
                          </DropdownMenuItem>
                        ) : user.status === "suspended" ? (
                          <DropdownMenuItem className="text-green-600">
                            <Check className="w-4 h-4 mr-2" />
                            Reactivate User
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPage>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles = {
    ADMIN: "bg-purple-100 text-purple-700",
    ENGINEER: "bg-blue-100 text-blue-700",
    CUSTOMER: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge
      variant="outline"
      className={cn("border-0", styles[role as keyof typeof styles])}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <Badge
      variant="outline"
      className={cn("border-0", styles[status as keyof typeof styles])}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
