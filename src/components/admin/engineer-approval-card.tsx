"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveEngineer, rejectEngineer, suspendEngineer, type EngineerProfileWithRelations } from "@/lib/actions/engineer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Award,
  Wrench,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Calendar,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Props = {
  profile: EngineerProfileWithRelations;
};

export function EngineerApprovalCard({ profile }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveEngineer(profile.id);
      if (result.success) {
        toast.success("Engineer approved successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to approve engineer");
      }
    } catch {
      toast.error("Failed to approve engineer");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setLoading(true);
    try {
      const result = await rejectEngineer(profile.id, rejectReason);
      if (result.success) {
        toast.success("Application rejected");
        setShowRejectDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reject application");
      }
    } catch {
      toast.error("Failed to reject application");
    }
    setLoading(false);
  };

  const handleSuspend = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }
    setLoading(true);
    try {
      const result = await suspendEngineer(profile.id, rejectReason);
      if (result.success) {
        toast.success("Engineer suspended");
        setShowSuspendDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to suspend engineer");
      }
    } catch {
      toast.error("Failed to suspend engineer");
    }
    setLoading(false);
  };

  const getStatusBadge = () => {
    switch (profile.status) {
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <Ban className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-lg font-bold">
              {profile.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">{profile.user.name}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {profile.user.email}
                </span>
                {profile.user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {profile.user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{profile.yearsExperience} years experience</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span>{profile.qualifications.length} qualifications</span>
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span>{profile.competencies.length} services</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{profile.coverageAreas.length} areas</span>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-6 pt-6 border-t space-y-6">
            {/* Bio */}
            {profile.bio && (
              <div>
                <h4 className="text-sm font-medium mb-2">Bio</h4>
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            {/* Day Rate */}
            {profile.dayRate && (
              <div>
                <h4 className="text-sm font-medium mb-2">Day Rate</h4>
                <p className="text-lg font-semibold">£{profile.dayRate}</p>
              </div>
            )}

            {/* Qualifications */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Qualifications
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.qualifications.map((q) => (
                  <Badge key={q.id} variant="secondary" className="py-1">
                    {q.name}
                    {q.issuingBody && (
                      <span className="ml-1 text-muted-foreground">
                        ({q.issuingBody})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Services
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.competencies.map((c) => (
                  <Badge key={c.id} variant="secondary" className="py-1">
                    {c.service.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Coverage Areas */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Coverage Areas
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.coverageAreas.map((a) => (
                  <Badge key={a.id} variant="outline" className="py-1">
                    {a.postcodePrefix}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Applied Date */}
            <div className="text-sm text-muted-foreground">
              Applied: {formatDate(profile.createdAt)}
              {profile.approvedAt && (
                <span className="ml-4">Approved: {formatDate(profile.approvedAt)}</span>
              )}
            </div>

            {/* Rejection Reason */}
            {profile.rejectedReason && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800">Reason:</p>
                <p className="text-sm text-red-700">{profile.rejectedReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {profile.status === "PENDING_APPROVAL" && (
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 gradient-primary text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Application</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this engineer&apos;s application.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Reject Application
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {profile.status === "APPROVED" && (
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50">
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Suspend Engineer</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for suspending this engineer.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Reason for suspension..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSuspend}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Suspend Engineer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {(profile.status === "REJECTED" || profile.status === "SUSPENDED") && (
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              onClick={handleApprove}
              disabled={loading}
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Reinstate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
