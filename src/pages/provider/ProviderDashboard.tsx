import { useProviderMembership } from "@/hooks/useProviderProfile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ShieldCheck, User, Send, BookOpen, Users, Clock, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ProviderStatusBanner from "@/components/provider/ProviderStatusBanner";
import ExplanationPanel from "@/components/explainability/ExplanationPanel";
import { useProviderVisibilityExplanation } from "@/explainability/hooks/useProviderVisibilityExplanation";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-orange-100 text-orange-800",
  inactive: "bg-muted text-muted-foreground",
};

const ProviderDashboard = () => {
  const { data: membership, isLoading } = useProviderMembership();
  const { toast } = useToast();
  const qc = useQueryClient();

  const providerId = membership?.provider?.id;

  const { data: catalogCounts } = useQuery({
    queryKey: ["provider_catalog_counts", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_items")
        .select("id, review_status")
        .eq("provider_id", providerId!)
        .eq("ownership_type", "provider");
      if (error) throw error;
      const items = data ?? [];
      return {
        total: items.length,
        pending: items.filter((i: any) => i.review_status === "pending_review").length,
        approved: items.filter((i: any) => i.review_status === "approved").length,
      };
    },
  });

  const { data: memberCount } = useQuery({
    queryKey: ["provider_member_count", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_members")
        .select("id")
        .eq("provider_id", providerId!)
        .eq("status", "active");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const submitForReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("providers")
        .update({ status: "pending_review" })
        .eq("id", providerId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Provider submitted for review" });
      qc.invalidateQueries({ queryKey: ["provider_membership"] });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading provider workspace…</p>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No active provider membership found.</p>
      </div>
    );
  }

  const { provider } = membership;
  const isActive = provider.status === "active";

  const providerVisibility = useProviderVisibilityExplanation({
    isPublic: isActive,
    isVerified: provider.verification_status === "verified",
    isActive,
    verificationCount: provider.verification_status === "verified" ? 1 : 0,
    hasCompleteProfile: !!(provider.display_name && provider.bio && provider.contact_email),
    hasEligibleCatalogItems: (catalogCounts?.approved ?? 0) > 0,
    isRestricted: provider.status === "suspended",
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Provider Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to your provider workspace.</p>
      </div>

      <ProviderStatusBanner status={provider.status} rejectionReason={provider.rejection_reason} />

      {/* Identity cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{provider.display_name}</p>
            <p className="text-xs text-muted-foreground capitalize mt-1">{provider.type.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[provider.status] ?? ""}>{provider.status.replace(/_/g, " ")}</Badge>
            <p className="text-xs text-muted-foreground mt-2 capitalize">Verification: {provider.verification_status}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize">{membership.role}</p>
          </CardContent>
        </Card>
      </div>

      {/* Workspace summary counts */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{catalogCounts?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Catalog Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
            <p className="text-2xl font-bold">{catalogCounts?.pending ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{catalogCounts?.approved ?? 0}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{memberCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Visibility Explanation */}
      {providerVisibility.status === "ready" && (
        <ExplanationPanel explanation={providerVisibility} />
      )}

      {/* Submit for review */}
      {provider.status === "draft" && ["owner", "admin"].includes(membership.role) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to submit?</p>
                <p className="text-sm text-muted-foreground">Submit your provider for platform review.</p>
              </div>
              <Button onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                <Send className="h-4 w-4 mr-1" /> Submit for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderDashboard;
