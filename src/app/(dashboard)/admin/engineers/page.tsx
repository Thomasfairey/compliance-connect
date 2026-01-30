import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import { getAllUsers, getAllEngineerProfiles } from "@/lib/actions";

export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { RoleSelector } from "@/components/admin/role-selector";
import { EngineerApprovalCard } from "@/components/admin/engineer-approval-card";
import { SetupEngineersButton } from "@/components/admin/setup-engineers-button";
import { Users, UserCheck, Clock, XCircle } from "lucide-react";

export const metadata = {
  title: "Manage Users & Engineers",
};

export default async function AdminEngineersPage() {
  const user = await getOrCreateUser();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [users, allProfiles] = await Promise.all([
    getAllUsers(),
    getAllEngineerProfiles(),
  ]);

  const pendingProfiles = allProfiles.filter((p) => p.status === "PENDING_APPROVAL");
  const approvedProfiles = allProfiles.filter((p) => p.status === "APPROVED");
  const rejectedProfiles = allProfiles.filter((p) => p.status === "REJECTED" || p.status === "SUSPENDED");

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ENGINEER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div>
      <PageHeader
        title="Users & Engineers"
        description="Manage user roles and approve engineer applications"
      />

      {/* Auto-Allocation Setup */}
      <div className="mb-6">
        <SetupEngineersButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingProfiles.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedProfiles.length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedProfiles.length}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingProfiles.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs">
                {pendingProfiles.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved Engineers</TabsTrigger>
          <TabsTrigger value="rejected">Rejected/Suspended</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
        </TabsList>

        {/* Pending Applications */}
        <TabsContent value="pending">
          {pendingProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">No pending applications</p>
                <p className="text-sm text-muted-foreground">New engineer applications will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingProfiles.map((profile) => (
                <EngineerApprovalCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Engineers */}
        <TabsContent value="approved">
          {approvedProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">No approved engineers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvedProfiles.map((profile) => (
                <EngineerApprovalCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected/Suspended */}
        <TabsContent value="rejected">
          {rejectedProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">No rejected applications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rejectedProfiles.map((profile) => (
                <EngineerApprovalCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Change Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.companyName || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getRoleBadgeColor(u.role)}
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(u.createdAt)}</TableCell>
                        <TableCell>
                          <RoleSelector
                            userId={u.id}
                            currentRole={u.role}
                            disabled={u.id === user.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
